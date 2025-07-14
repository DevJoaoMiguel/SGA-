const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Verifica se as variáveis de ambiente estão definidas
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Erro: Credenciais de email não configuradas no .env');
    console.error('Por favor, configure EMAIL_USER e EMAIL_APP_PASSWORD no arquivo .env');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para porta 465, false para outras portas
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verifica a conexão ao iniciar
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Erro na configuração do email:', error);
    } else {
        console.log('✅ Servidor de email pronto para enviar mensagens');
    }
});

const sendRegistrationApprovalEmail = async (user) => {
    try {
        const approveUrl = `${process.env.APP_URL}/approve/${user.approvalToken}`;
        const rejectUrl = `${process.env.APP_URL}/reject/${user.approvalToken}`;

        const mailOptions = {
            from: `"SGA Sistema" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL,
            subject: 'Aprovação de Registro Necessária',
            html: `
                <h3>Um novo usuário solicitou registro:</h3>
                <p><strong>Nome:</strong> ${user.name}</p>
                <p><strong>E-mail:</strong> ${user.email}</p>
                <p><strong>ETEC:</strong> ${user.etec}</p>
                <p>Para aprovar o registro, clique <a href="${approveUrl}">aqui</a>.</p>
                <p>Para rejeitar o registro, clique <a href="${rejectUrl}">aqui</a>.</p>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        throw error;
    }
};

module.exports = { sendRegistrationApprovalEmail };  
