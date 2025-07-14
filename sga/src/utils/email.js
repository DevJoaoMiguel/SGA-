const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

class EmailService {
  static async sendOrderConfirmation(userEmail, userName, orderDetails) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Confirmação de Pedido',
        html: `
          <h1>Olá, ${userName}!</h1>
          <p>Seu pedido foi recebido com sucesso.</p>
          <h2>Detalhes do Pedido:</h2>
          <ul>
            <li>ID do Pedido: ${orderDetails.id}</li>
            <li>Data: ${new Date(orderDetails.createdAt).toLocaleDateString()}</li>
            <li>Total: R$ ${orderDetails.precoTotal.toFixed(2)}</li>
            <li>Status: ${orderDetails.status === 'approved' ? 'Aprovado' : 'Pendente'}</li>
          </ul>
          <h3>Itens:</h3>
          <ul>
            ${orderDetails.items.map(item => `
              <li>
                ${item.product.title} - 
                Tamanho: ${item.tamanho} - 
                Quantidade: ${item.quantidade} - 
                Preço: R$ ${item.preco.toFixed(2)}
              </li>
            `).join('')}
          </ul>
          <p>Obrigado por comprar conosco!</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('E-mail de confirmação enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar e-mail de confirmação:', error);
      throw error;
    }
  }

  static async sendStatusUpdate(userEmail, userName, orderDetails) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Atualização do Status do Pedido',
        html: `
          <h1>Olá, ${userName}!</h1>
          <p>O status do seu pedido foi atualizado.</p>
          <h2>Detalhes do Pedido:</h2>
          <ul>
            <li>ID do Pedido: ${orderDetails.id}</li>
            <li>Status: ${orderDetails.status === 'approved' ? 'Aprovado' : orderDetails.status === 'pending' ? 'Pendente' : 'Cancelado'}</li>
            <li>Data da Atualização: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Obrigado por comprar conosco!</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('E-mail de atualização de status enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar e-mail de atualização de status:', error);
      throw error;
    }
  }
}

module.exports = EmailService; 