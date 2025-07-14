const RentalService = require('../services/rentalService');
const AuthService = require('../services/authService');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

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

class RentalController {
  constructor() {
    // Removendo a criação do produto padrão
  }

  isValidNotification(notification) {
    // Verifica se é uma notificação de merchant_order
    if (notification.topic === 'merchant_order') {
      return true;
    }

    // Verifica se é uma notificação de payment
    if (notification.type === 'payment') {
      const isValid = (
        notification &&
        notification.data &&
        notification.data.id &&
        typeof notification.data.id === 'string'
      );

      console.log('Resultado da validação da notificação de pagamento:', isValid);
      return isValid;
    }

    // Verifica se é uma notificação de payment.created
    if (notification.action === 'payment.created') {
      const isValid = (
        notification &&
        notification.data &&
        notification.data.id &&
        typeof notification.data.id === 'string'
      );

      console.log('Resultado da validação da notificação payment.created:', isValid);
      return isValid;
    }

    console.log('Tipo de notificação não reconhecido:', {
      type: notification.type,
      action: notification.action,
      topic: notification.topic
    });
    return false;
  }

  async createRental(req, res) {
    const { lockerId, userId, rentType } = req.body;

    if (!lockerId || !userId || !rentType) {
      console.log('❌ Erro: Campos obrigatórios ausentes');
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const parsedLockerId = parseInt(lockerId);
    const parsedUserId = parseInt(userId);

    if (isNaN(parsedLockerId) || isNaN(parsedUserId)) {
      console.log('❌ Erro: ID do armário ou do usuário inválido');
      return res.status(400).json({ error: 'ID do armário ou do usuário inválido.' });
    }

    console.log('🔄 Informações recebidas no createRental:', { lockerId: parsedLockerId, userId: parsedUserId, rentType });

    try {
      const existingRental = await prisma.rental.findFirst({
        where: {
          userId: parsedUserId,
          status: {
            in: ['pendente', 'ativo', 'pré-reservado']
          }
        }
      });

      const lockerReservation = await prisma.rental.findFirst({
        where: {
          lockerId: parsedLockerId,
          status: {
            in: ['pré-reservado', 'ativo']
          }
        }
      });

      const user = await prisma.user.findUnique({
        where: { id: parsedUserId },
        select: { 
          email: true,    
          Nome: true,     
          anoCurso: true  
        }
      });

      if (!user) {
        console.log('❌ Erro: Usuário não encontrado');
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      if (rentType === 'period' && Math.floor(user.anoCurso / 10) !== 3) {
        console.log('❌ Erro: Apenas alunos do módulo 3 podem alugar por período');
        return res.redirect('/corredores?error=Apenas alunos do módulo 3 podem alugar por período');
      }

      if (existingRental) {
        console.log('❌ Erro: Usuário já possui um aluguel ativo, pendente ou pré-reservado');
        return res.redirect('/corredores?error=Você já possui um armário.');
      }
      if (lockerReservation) {
        console.log('❌ Erro: Armário já pré-reservado');
        return res.status(400).json({ error: 'Armário já pré-reservado.' });
      }

      const locker = await RentalService.getLockerById(parsedLockerId);
      if (!locker || locker.status !== 'livre') {
        console.log('❌ Erro: Armário não disponível');
        return res.status(400).json({ error: 'Armário não disponível.' });
      }

      console.log('✅ Informações do armário:', locker);

      const rental = await RentalService.createRental(parsedLockerId, parsedUserId, rentType, 'pre-reservado');

      await prisma.locker.update({
        where: { id: parsedLockerId },
        data: { status: 'pre-reservado' }
      });
      console.log('✅ Pré-reserva criada com sucesso!');
      await prisma.user.update({
        where: { id: parsedUserId },
        data: { lockerId: parsedLockerId }
      });

      const rentalPrice = rentType === 'year' ? 100 : rentType === 'period' ? 50 : 2;

      const body = {
        items: [
          {
            id: lockerId,
            title: `Aluguel do Armário ${locker.numero}`,
            quantity: 1,
            unit_price: rentalPrice,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: user.Nome,
          email: user.email,
        },
        external_reference: `rental-${rental.id}`,
        back_urls: {
          success: `${process.env.APP_URL}/success`,
          failure: `${process.env.APP_URL}/failure`,
          pending: `${process.env.APP_URL}/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.APP_URL}/webhook`,
      };

      const response = await preference.create({ body });
      console.log('✅ Preference ID gerada:', response.id);

      await RentalService.updatePreferenceId(rental.id, response.id);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Link de Pagamento - Aluguel do Armário',
        html: `
          <h1>Olá, ${user.Nome}!</h1>
          <p>Clique no link abaixo para realizar o pagamento do aluguel do armário:</p>
          <a href="${response.init_point}" target="_blank">Pagar Agora</a>
          <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
          <p>${response.init_point}</p>
          <p>Quando efetuar o pagamento comparecer na secretaria e mostrar o comprovante para ser liberado o armário.</p>
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
      res.redirect(response.init_point);
    } catch (error) {
      console.error('❌ Erro ao criar preferência:', error);
      res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
    }
  }

  async handlePaymentNotification(req, res) {
    try {
      const { type, data } = req.body;

      if (type === 'payment') {
        const paymentId = data.id;
        const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.KEYMP}`
          }
        }).then(res => res.json());

        if (payment.status === 'approved') {
          const rentalId = payment.external_reference.split('-')[1];
          const rental = await prisma.rental.findUnique({
            where: { id: parseInt(rentalId) }
          });

          if (!rental) {
            throw new Error('Aluguel não encontrado');
          }

          // Cria o registro de pagamento
          const pagamento = await prisma.pagamento.create({
            data: {
              status: payment.status,
              precoUnitario: payment.transaction_amount, // valor do pagamento
              quantidade: 1,
              precoTotal: payment.transaction_amount, // valor total
              userId: rental.userId,
              productId: null, // agora permitido!
              tamanho: null
            }
          });

          // Atualiza o status do aluguel e do armário
          await prisma.rental.update({
            where: { id: parseInt(rentalId) },
            data: {
              status: 'ativo',
              paymentId: pagamento.id,
              startDate: new Date(),
              endDate: new Date(Date.now() + (rental.rentType === 'year' ? 365 * 24 * 60 * 60 * 1000 : 150 * 24 * 60 * 60 * 1000))
            }
          });

          await prisma.locker.update({
            where: { id: rental.lockerId },
            data: { status: 'ocupado' }
          });

          // Atualiza o lockerId do usuário
          await prisma.user.update({
            where: { id: rental.userId },
            data: { lockerId: rental.lockerId }
          });

          console.log('✅ Pagamento de aluguel processado com sucesso');
          return res.status(200).send('Pagamento de aluguel processado com sucesso');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar notificação de aluguel:', error);
      return res.status(500).send('Erro ao processar notificação');
    }
  }

  async getAllRental(req, res) {
    try {
      const rentals = await RentalService.getAllRental();
      res.status(200).json(rentals);
    } catch (error) {
      console.error('❌ Erro ao obter todos os aluguéis:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getRentalById(req, res) {
    const { id } = req.params;

    if (!id) {
      console.log('❌ Erro: ID é obrigatório');
      return res.status(400).json({ error: 'ID é obrigatório' });
    }

    try {
      const rental = await RentalService.getRentalById(Number(id));
      if (!rental) {
        console.log('❌ Erro: Aluguel não encontrado');
        return res.status(404).json({ error: 'Aluguel não encontrado' });
      }
      console.log('✅ Aluguel encontrado:', rental);
      res.status(200).json(rental);
    } catch (error) {
      console.error('❌ Erro ao buscar aluguel por ID:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateRental(req, res) {
    const { id } = req.params;
    const data = req.body;

    if (!id) {
      console.log('❌ Erro: ID é obrigatório');
      return res.status(400).json({ error: 'ID é obrigatório' });
    }

    try {
      const updatedRental = await RentalService.updateRental(Number(id), data);
      console.log('✅ Aluguel atualizado:', updatedRental);
      res.status(200).json(updatedRental);
    } catch (error) {
      console.error('❌ Erro ao atualizar aluguel:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getLockerReport(req, res) {
    try {
      const rentedLockers = await prisma.locker.count({
        where: { status: 'ocupado' }
      });

      const availableLockers = await prisma.locker.count({
        where: { status: 'livre' }
      });

      return res.status(200).json({
        alugados: rentedLockers,
        disponiveis: availableLockers
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de armários:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
  }

  async deleteRental(req, res) {
    const { id } = req.params;

    if (!id) {
      console.log('❌ Erro: ID é obrigatório');
      return res.status(400).json({ error: 'ID é obrigatório' });
    }

    try {
      const deletedRental = await RentalService.deleteRental(Number(id));

      await prisma.user.update({
        where: { id: deletedRental.userId },
        data: { lockerId: null }
      });

      console.log('✅ Aluguel deletado:', deletedRental);
      res.status(200).json(deletedRental);
    } catch (error) {
      console.error('❌ Erro ao deletar aluguel:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updatePreferenceId(rentalId, preferenceId) {
    try {
      const updatedRental = await prisma.rental.update({
        where: { id: rentalId },
        data: { preferenceId }
      });
      console.log('Preference ID atualizado com sucesso para o aluguel:', updatedRental);
      return updatedRental;
    } catch (error) {
      console.error('Erro ao atualizar preference ID:', error);
      throw error;
    }
  }
}

cron.schedule('* * * * *', async () => {
  console.log('🔄 Verificando aluguéis expirados...');

  try {
    const rentals = await prisma.rental.findMany({
      where: { status: 'pre-reservado' },
    });

    for (let rental of rentals) {
      const creationTime = rental.createdAt;
      const currentTime = new Date();
      const timeDiff = Math.abs(currentTime - creationTime);
      const secondsDiff = timeDiff / 1000;

      if (secondsDiff > 90) { 
        console.log(`❌ Pré-reserva do aluguel ${rental.id} expirou após 1 minuto e 30 segundos, liberando armário.`);
        await prisma.rental.update({
          where: { id: rental.id },
          data: { status: 'cancelado' },
        });

        await prisma.locker.update({
          where: { id: rental.lockerId },
          data: { status: 'livre' },
        });

        await prisma.user.update({
          where: { id: rental.userId },
          data: { lockerId: null }
        });

        console.log('✅ Armário liberado');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar pré-reservas expiradas:', error);
  }
});

module.exports = new RentalController();
