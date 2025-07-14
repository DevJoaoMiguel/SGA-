const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const nodemailer = require('nodemailer');
const ProductService = require('../services/productService');
const AuthService = require('../services/authService');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const prisma = require('../config/database');

dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.KEYMP,
  options: { timeout: 5000 },
});

const preference = new Preference(client);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class ProductController {
  isValidNotification(notification) {
    // Verifica se é uma notificação de merchant_order
    if (notification.topic === 'merchant_order') {
      return true;
    }

    // Verifica se é uma notificação de payment
    const isValid = (
      notification &&
      notification.type === 'payment' &&
      notification.action &&
      notification.data &&
      notification.data.id &&
      typeof notification.data.id === 'string'
    );

    console.log('Resultado da validação da notificação:', isValid);
    return isValid;
  }

  async createProduct(req, res) {
    const { title, price, typeroupas } = req.body;
    const image = req.file ? req.file.filename : null;
    const tamanhos = Array.isArray(req.body.tamanhos) ? req.body.tamanhos : [];
    const quantidades = Array.isArray(req.body.quantidades) ? req.body.quantidades : [];

    console.log('Dados recebidos:', {
      title,
      price,
      typeroupas,
      image,
      tamanhos,
      quantidades
    });

    if (!title || !price || !typeroupas || !image) {
      return res.status(400).json({ success: false, error: 'Preencha todos os campos, incluindo a imagem.' });
    }

    if (tamanhos.length === 0 || quantidades.length === 0) {
      return res.status(400).json({ success: false, error: 'Adicione pelo menos um tamanho e sua quantidade.' });
    }

    try {
      const newProduct = await ProductService.createProduct({
        title,
        price,
        typeroupas,
        image,
        tamanhos,
        quantidades
      });

      if (!newProduct) {
        return res.status(500).json({ success: false, error: 'Erro ao adicionar produto.' });
      }

      res.redirect('/lojaadm');
    } catch (error) {
      console.error(`Erro ao criar produto: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao adicionar produto: ${error.message}` });
    }
  }

  async purchaseProduct(req, res) {
    const { productId, userId, tamanho } = req.body;

    if (!productId || !userId || !tamanho) {
      console.log('❌ Erro: Campos obrigatórios ausentes');
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const parsedProductId = parseInt(productId);
    const parsedUserId = parseInt(userId);

    if (isNaN(parsedProductId) || isNaN(parsedUserId)) {
      console.log('❌ Erro: ID do produto ou do usuário inválido');
      return res.status(400).json({ error: 'ID do produto ou do usuário inválido.' });
    }

    console.log('🔄 Informações recebidas no purchaseProduct:', {
      productId: parsedProductId,
      userId: parsedUserId,
      tamanho,
      body: req.body
    });

    try {
      const product = await ProductService.getProductById(parsedProductId);
      const user = await AuthService.getUserById(parsedUserId);

      if (!product) {
        console.log('❌ Erro: Produto não encontrado');
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }

      if (!user) {
        console.log('❌ Erro: Usuário não encontrado');
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Verifica se há estoque disponível para o tamanho
      const stock = await prisma.stock.findFirst({
        where: {
          productId: parsedProductId,
          tamanho: tamanho
        }
      });

      if (!stock || stock.quantidade <= 0) {
        console.log('❌ Erro: Estoque insuficiente para o tamanho selecionado');
        return res.status(400).json({ error: 'Estoque insuficiente para o tamanho selecionado.' });
      }

      console.log('✅ Produto e usuário encontrados:', {
        product: product.title,
        user: user.Nome,
        price: product.price,
        tamanho,
        quantidadeDisponivel: stock.quantidade
      });

      const body = {
        items: [{
          id: productId,
          title: `Compra do Produto ${product.title} - Tamanho ${tamanho}`,
          quantity: 1,
          unit_price: parseFloat(product.price),
          currency_id: 'BRL',
        }],
        payer: {
          name: user.Nome,
          email: user.email,
        },
        external_reference: `product-${productId}`,
        back_urls: {
          success: `${process.env.APP_URL}/success`,
          failure: `${process.env.APP_URL}/failure`,
          pending: `${process.env.APP_URL}/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.APP_URL}/webhook`,
        metadata: {
          tipo: 'product',
          product_id: productId.toString(),
          user_id: userId.toString(),
          productTitle: product.title,
          userName: user.Nome,
          tamanho: tamanho
        },
        additional_info: {
          items: [{
            id: productId,
            title: product.title,
            description: `Compra do produto ${product.title} - Tamanho ${tamanho}`,
            quantity: 1,
            unit_price: parseFloat(product.price),
          }],
          payer: {
            first_name: user.Nome.split(' ')[0],
            email: user.email
          }
        }
      };

      console.log('🛒 Criando preferência de pagamento com dados:', {
        items: body.items,
        payer: { name: body.payer.name, email: body.payer.email },
        back_urls: body.back_urls,
        metadata: body.metadata
      });

      const response = await preference.create({ body });
      console.log('✅ Preference ID gerada:', response.id);

      if (!response || !response.id) {
        throw new Error('Resposta inválida do Mercado Pago');
      }

      await ProductService.updatePreferenceId(product.id, response.id);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Link de Pagamento - Compra de Produto',
        html: `
          <h1>Olá, ${user.Nome}!</h1>
          <p>Clique no link abaixo para realizar o pagamento do produto:</p>
          <a href="${response.init_point}" target="_blank">Pagar Agora</a>
          <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
          <p>${response.init_point}</p>
          <p>Após o pagamento, compareça à secretaria para retirar o produto.</p>
          <p>Produto: ${product.title} - Tamanho: ${tamanho}</p>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('❌ Erro ao enviar e-mail:', error);
        } else {
          console.log('📧 E-mail enviado com sucesso:', info.response);
        }
      });

      console.log('🔗 Redirecionando para o pagamento com URL:', response.init_point);

      if (!response.init_point) {
        throw new Error('URL de pagamento não gerada pelo Mercado Pago');
      }

      res.redirect(response.init_point);
    } catch (error) {
      console.error('❌ Erro ao criar preferência:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });

      res.status(500).json({
        error: 'Erro ao criar preferência de pagamento',
        details: error.message,
        code: error.code
      });
    }
  }

  async handlePaymentNotification(req, res) {
    try {
      console.log('📦 Recebendo notificação:', JSON.stringify(req.body, null, 2));
      
      // Extrair ID do pagamento
      let paymentId = null;
      if (req.body.type === 'payment') {
        paymentId = req.body.data.id;
      } else if (req.body.action === 'payment.created') {
        paymentId = req.body.data.id;
      }

      if (!paymentId) {
        console.log('ℹ️ Notificação sem ID de pagamento válido');
        return res.status(200).json({ message: 'Notificação sem ID de pagamento válido' });
      }

      // Buscar detalhes do pagamento
      const paymentDetails = await this.getPaymentDetails(paymentId);

      if (paymentDetails.status !== 'approved') {
        console.log('ℹ️ Pagamento não aprovado. Status:', paymentDetails.status);
        return res.status(200).json({ message: `Pagamento ${paymentDetails.status}` });
      }

      // Extrair metadata
      const metadata = paymentDetails.metadata || {};
      const userId = parseInt(metadata.user_id);
      const productId = parseInt(metadata.product_id);
      const tamanho = metadata.tamanho;

      // Buscar usuário e produto
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const product = await prisma.product.findUnique({ where: { id: productId } });

      if (!user || !product) {
        console.log('⚠️ Usuário ou produto não encontrado');
        return res.status(200).json({ message: 'Usuário ou produto não encontrado' });
      }

      console.log('Detalhes do pagamento recebidos:', {
        status: paymentDetails.status,
        transaction_amount: paymentDetails.transaction_amount,
        metadata: paymentDetails.metadata
      });

      console.log('Dados do usuário:', {
        id: user.id,
        nome: user.Nome,
        email: user.email,
        rm: user.rm
      });

      console.log('Dados do produto:', {
        id: product.id,
        title: product.title,
        price: product.price
      });

      // Validações adicionais
      if (!paymentDetails.transaction_amount && !product.price) {
        throw new Error('Preço não definido no pagamento nem no produto');
      }

      if (isNaN(Number(userId)) || isNaN(Number(productId))) {
        throw new Error('IDs inválidos');
      }

      try {
        const result = await prisma.$transaction(async (prisma) => {
          // Calcular preço total ANTES de usar
          const precoTotal = Number(paymentDetails.transaction_amount) || Number(product.price);

          // Log dos dados antes de criar o pedido
          console.log('Dados para criação do pedido:', {
            userId: Number(userId),
            nome: user.Nome,
            email: user.email,
            rm: user.rm,
            produtoId: Number(productId),
            tamanho: tamanho,
            totalPrice: precoTotal // Agora precoTotal já está definido
          });

          // Verificar estoque
          const stock = await prisma.stock.findFirst({
            where: {
              productId: Number(productId),
              tamanho: tamanho
            }
          });

          if (!stock || stock.quantidade < 1) {
            throw new Error('Estoque insuficiente');
          }

          // Atualizar estoque
          await prisma.stock.update({
            where: { id: stock.id },
            data: { quantidade: stock.quantidade - 1 }
          });

          // Criar pagamento
          const payment = await prisma.pagamento.create({
            data: {
              status: paymentDetails.status,
              precoUnitario: precoTotal,
              quantidade: 1,
              precoTotal: precoTotal,
              userId: Number(userId),
              productId: Number(productId),
              tamanho: tamanho
            }
          });

          console.log('Pagamento criado:', payment);

          // Criar pedido
          const pedido = await prisma.pedido.create({
            data: {
              userId: Number(userId),
              nome: user.Nome || '',
              email: user.email || '',
              rm: user.rm || '',
              produtoId: Number(productId),
              quantidade: 1,
              tamanho: tamanho || '',
              totalPrice: precoTotal, // Usando o precoTotal já calculado
              status: "pendente"
            }
          });

          console.log('Pedido criado:', pedido);

          return { payment, pedido };
        });

        console.log('✅ Transação concluída com sucesso:', {
          pagamentoId: result.payment.id,
          pedidoId: result.pedido.id
        });

        // Enviar email de confirmação
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: 'Confirmação de Pagamento',
          html: `
            <h1>Olá, ${user.Nome}!</h1>
            <p>Seu pagamento foi confirmado com sucesso!</p>
            <p>Detalhes do pedido:</p>
            <ul>
              <li>Produto: ${product.title}</li>
              <li>Tamanho: ${tamanho}</li>
              <li>Valor: R$ ${paymentDetails.transaction_amount}</li>
            </ul>
            <p>Aguarde o email para retirada do produto.</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log('📧 Email de confirmação enviado para:', user.email);

        return res.status(200).json({ success: true });

      } catch (error) {
        console.log('❌ Erro detalhado ao processar transação:', {
          message: error.message,
          code: error.code,
          meta: error.meta
        });
        throw error;
      }

    } catch (error) {
      console.log('❌ Erro geral:', error.message);
      return res.status(200).json({ success: false, message: error.message });
    }
  }

  async getAllProductsForAdmin(req, res) {
    try {
      const products = await prisma.product.findMany({
        include: {
          stocks: true
        }
      });
      const admin = req.session.admin || null;

      res.render('shop/lojaadm', { products, admin, error: null });
    } catch (error) {
      console.error(`Erro ao buscar produtos: ${error.message}`);
      res.status(500).render('shop/lojaadm', { products: [], admin: null, error: 'Erro ao carregar produtos.' });
    }
  }

  async getAllProductsForShop(req, res) {
    try {
      const products = await ProductService.getAllProducts();
      const user = req.session.user || null;
      res.render('shop/loja', { products, user, error: null });
    } catch (error) {
      console.error(`Erro ao buscar produtos: ${error.message}`);
      res.status(500).render('shop/loja', { products: [], user: null, error: 'Erro ao carregar produtos.' });
    }
  }

  async getProductsforDetails(req, res) {
    try {
      const id = req.params.id;
      const userId = req.user.id;
      const product = await ProductService.getProductById(Number(id));

      if (!product) {
        return res.status(404).send("Produto não encontrado");
      }

      res.render("shop/Detalhesproduct", {
        product,
        userId,
        stocks: product.stocks || []
      });
    } catch (error) {
      console.error("Erro ao buscar produto:", error);
      res.status(500).send("Erro ao buscar produto");
    }
  }

  async getProductById(req, res) {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      const product = await ProductService.getProductById(numericId);

      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }
      res.status(200).json({ success: true, product });
    } catch (error) {
      console.error(`Erro ao carregar o produto: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao carregar o produto: ${error.message}` });
    }
  }

  async getUpdateProductPage(req, res) {
    const { id } = req.params;
    try {
      const product = await ProductService.getProductById(id);

      if (!product) {
        return res.status(404).render('shop/lojaadm', { products: [], error: 'Produto não encontrado.' });
      }

      res.render('shop/updateproduct', { product, error: null });
    } catch (error) {
      console.error(`Erro ao carregar a página de atualização do produto: ${error.message}`);
      res.status(500).render('shop/updateproduct', { product: {}, error: 'Erro ao carregar os dados do produto.' });
    }
  }

  async updateProduct(req, res) {
    const { id } = req.params;
    const data = req.body;
    const numericId = Number(id);
    const image = req.file ? req.file.filename : null;

    console.log("📥 Dados recebidos no body:", data);
    console.log("🆔 ID recebido:", numericId);
    console.log("🖼️ Imagem recebida:", image);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      if (image) {
        data.image = image;
      }

      // Atualiza o produto
      const updatedProduct = await prisma.product.update({
        where: { id: numericId },
        data: {
          title: data.title,
          price: parseFloat(data.price),
          typeroupas: data.typeroupas,
          image: data.image
        },
        include: {
          stocks: true
        }
      });

      // Atualiza o estoque
      if (data.tamanhos && data.quantidades) {
        for (let i = 0; i < data.tamanhos.length; i++) {
          const tamanho = data.tamanhos[i];
          const quantidade = parseInt(data.quantidades[tamanho]);

          await prisma.stock.upsert({
            where: {
              productId_tamanho: {
                productId: numericId,
                tamanho: tamanho
              }
            },
            update: {
              quantidade: quantidade
            },
            create: {
              productId: numericId,
              tamanho: tamanho,
              quantidade: quantidade
            }
          });
        }
      }

      res.redirect('/lojaadm');
    } catch (error) {
      console.error(`❌ Erro ao atualizar produto: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao atualizar produto: ${error.message}` });
    }
  }

  async deleteProduct(req, res) {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      const result = await ProductService.deleteProduct(numericId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Produto não encontrado.' });
      }


      res.redirect('/lojaadm');
    } catch (error) {
      console.error(`Erro ao deletar produto: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao deletar produto: ${error.message}` });
    }
  }

  async getPaymentDetails(paymentId) {
    try {
      console.log('Buscando detalhes do pagamento:', paymentId);

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.KEYMP}`,
        },
      });

      if (!response.ok) {
        console.error('Erro ao buscar detalhes do pagamento:', response.statusText);
        throw new Error('Erro ao buscar detalhes do pagamento');
      }

      const paymentDetails = await response.json();
      console.log('Detalhes do pagamento obtidos:', paymentDetails);

      return paymentDetails;
    } catch (error) {
      console.error('Erro ao obter detalhes do pagamento:', error);
      throw error;
    }
  }

  async sendPaymentConfirmationEmail(paymentDetails) {
    try {
      console.log('Preparando envio de email de confirmação');

      // Aqui você implementaria a lógica para enviar o email
      // Por exemplo, usando nodemailer ou outro serviço de email

      console.log('Email de confirmação enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar email de confirmação:', error);
      throw error;
    }
  }
}

module.exports = new ProductController();
