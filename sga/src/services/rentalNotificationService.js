const nodemailer = require('nodemailer');
const prisma = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class RentalNotificationService {
  static async sendExpirationNotification(rental, daysRemaining) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: rental.userId }
      });

      if (!user) {
        console.error('Usuário não encontrado para o aluguel:', rental.id);
        return;
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Alerta de Vencimento do Aluguel - ${daysRemaining} dias restantes`,
        html: `
          <h1>Olá, ${user.Nome}!</h1>
          <p>Seu aluguel do armário está próximo do vencimento.</p>
          <h2>Detalhes do Aluguel:</h2>
          <ul>
            <li>Armário: ${rental.locker.numero}</li>
            <li>Data de Vencimento: ${new Date(rental.endDate).toLocaleDateString()}</li>
            <li>Dias Restantes: ${daysRemaining}</li>
          </ul>
          <p>Importante: No dia do vencimento, você deverá retirar todos os seus pertences e devolver a chave do armário na secretaria.</p>
          <p>Se não renovar até a data de vencimento, seu armário será liberado para outros usuários.</p>
          <p>Atenciosamente,<br>Equipe de Administração</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Notificação de vencimento enviada para ${user.email} - ${daysRemaining} dias restantes`);
    } catch (error) {
      console.error('Erro ao enviar notificação de vencimento:', error);
    }
  }

  static async checkExpiringRentals() {
    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);

      // Buscar aluguéis que vencem em 7 dias
      const rentalsExpiringIn7Days = await prisma.rental.findMany({
        where: {
          status: 'ativo',
          endDate: {
            gte: sevenDaysFromNow,
            lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
          },
          locker: true
        },
        include: {
          locker: true
        }
      });

      // Buscar aluguéis que vencem em 3 dias
      const rentalsExpiringIn3Days = await prisma.rental.findMany({
        where: {
          status: 'ativo',
          endDate: {
            gte: threeDaysFromNow,
            lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
          },
          locker: true
        },
        include: {
          locker: true
        }
      });

      // Buscar aluguéis que vencem hoje
      const rentalsExpiringToday = await prisma.rental.findMany({
        where: {
          status: 'ativo',
          endDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          },
          locker: true
        },
        include: {
          locker: true
        }
      });

      // Enviar notificações
      for (const rental of rentalsExpiringIn7Days) {
        await this.sendExpirationNotification(rental, 7);
      }

      for (const rental of rentalsExpiringIn3Days) {
        await this.sendExpirationNotification(rental, 3);
      }

      for (const rental of rentalsExpiringToday) {
        await this.sendExpirationNotification(rental, 0);
      }

    } catch (error) {
      console.error('Erro ao verificar aluguéis próximos do vencimento:', error);
    }
  }
}

module.exports = RentalNotificationService; 