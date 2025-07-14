const prisma = require('../config/database');

class ProductService {
  
  async createProduct(data) {
    const { title, price, typeroupas, image, tamanhos, quantidades } = data;

    console.log('Dados recebidos no service:', {
      title,
      price,
      typeroupas,
      image,
      tamanhos,
      quantidades
    });

    try {
      // Cria o produto
      const product = await prisma.product.create({
        data: {
          title,
          price: parseFloat(price),
          typeroupas,
          image
        },
      });

      console.log('Produto criado:', product);

      // Cria os registros de estoque para cada tamanho
      for (let i = 0; i < tamanhos.length; i++) {
        if (quantidades[i] > 0) { // Só cria estoque se a quantidade for maior que 0
          const stock = await prisma.stock.create({
            data: {
              productId: product.id,
              tamanho: tamanhos[i],
              quantidade: parseInt(quantidades[i])
            },
          });
          console.log('Estoque criado:', stock);
        }
      }

      return product;
    } catch (error) {
      console.error(`Erro ao criar produto: ${error.message}`);
      throw new Error(`Erro ao criar o produto: ${error.message}`);
    }
  }

  
  async getAllProducts() {
    try {
      const products = await prisma.product.findMany();
      if (!products || products.length === 0) {
        console.log('Nenhum produto encontrado');
      }
      return products;
    } catch (error) {
      console.error(`Erro ao buscar produtos: ${error.message}`);
      throw new Error(`Erro ao buscar produtos: ${error.message}`);
    }
  }

  
  async getProductById(id) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: parseInt(id) },
        include: {
          stocks: true
        }
      });

      if (!product) {
        throw new Error('Produto não encontrado.');
      }

      return product;
    } catch (error) {
      console.error(`Erro ao buscar produto: ${error.message}`);
      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }
  }


async updateProduct(id, data) {
  const { title, price, typeroupas, tamanho, image } = data;

  console.log("Dados recebidos para atualização:", data);
  console.log("ID do produto:", id);
  console.log("Título:", title);
  console.log("Preço:", price);

  if (!title || price === undefined || isNaN(price)) {
    console.error("Validação falhou:", { title, price });
    throw new Error("Campos obrigatórios estão faltando ou inválidos.");
  }

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        title,
        price: parseFloat(price),
        typeroupas,
        tamanho,
        image
      },
    });

    console.log("Produto atualizado com sucesso:", updatedProduct);

    return updatedProduct;
  } catch (error) {
    console.error(`Erro ao atualizar produto: ${error.message}`);
    throw new Error(`Erro ao atualizar produto: ${error.message}`);
  }
}

  

  
  async deleteProduct(id) {
    try {
      // Primeiro, verifica se o produto existe
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          stocks: true,
          payments: true,
          pedidos: true
        }
      });

      if (!product) {
        return null;
      }

      // Deleta o produto e todos os registros relacionados em uma única transação
      await prisma.$transaction(async (prisma) => {
        // Deleta os registros de estoque (se existirem)
        if (product.stocks && product.stocks.length > 0) {
          await prisma.stock.deleteMany({
            where: { productId: id }
          });
        }

        // Deleta os pagamentos relacionados
        if (product.payments && product.payments.length > 0) {
          await prisma.pagamento.deleteMany({
            where: { productId: id }
          });
        }

        // Deleta os pedidos relacionados
        if (product.pedidos && product.pedidos.length > 0) {
          await prisma.pedido.deleteMany({
            where: { produtoId: id }
          });
        }

        // Finalmente, deleta o produto
        await prisma.product.delete({
          where: { id }
        });
      });

      return true;
    } catch (error) {
      console.error(`Erro ao deletar produto: ${error.message}`);
      throw error;
    }
  }

  async updatePreferenceId(productId, preferenceId) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new Error('Produto não encontrado');
      }

      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: { 
          preferenceId
        },
      });

      console.log('Preference ID atualizado com sucesso para o aluguel:', updatedProduct);

      return updatedProduct;
    } catch (error) {
      console.error('Erro ao atualizar Preference ID:', error);
      throw new Error(`Erro ao atualizar Preference ID: ${error.message}`);
    }
  }



  async registerProductPayment(productId, payment) {
    try {
      console.log('📝 Registrando pagamento do produto:', {
        productId,
        paymentId: payment.id,
        status: payment.status,
        status_detail: payment.status_detail
      });

      // Verifica se o pagamento está realmente aprovado
      if (payment.status !== 'approved' || payment.status_detail !== 'accredited') {
        console.log(`ℹ️ Pagamento não está aprovado. Status: ${payment.status}, Detalhe: ${payment.status_detail}`);
        return null;
      }

      // Cria o registro de pagamento
      const paymentRecord = await prisma.payment.create({
        data: {
          userId: parseInt(payment.metadata.user_id),
          quantity: 1,
          precoUnitario: payment.transaction_amount,
          totalPrice: payment.transaction_amount,
          status: payment.status
        }
      });

      console.log('✅ Pagamento registrado:', paymentRecord);

      // Atualiza o produto com o ID do pagamento
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          paymentId: paymentRecord.id
        }
      });

      console.log('✅ Produto atualizado com pagamento:', updatedProduct);

      return updatedProduct;
    } catch (error) {
      console.error('❌ Erro ao registrar pagamento do produto:', error);
      throw error;
    }
  }

  async getProductByPreferenceId(preferenceId) {
    try {
      const product = await prisma.product.findFirst({
        where: { preference_id: preferenceId },
      });
  
      return product;
    } catch (error) {
      console.error("❌ Erro ao buscar produto por preference_id:", error.message);
      throw error;
    }
  }
  
}

module.exports = new ProductService();
