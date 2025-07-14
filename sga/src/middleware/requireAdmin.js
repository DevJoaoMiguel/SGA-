const jwt = require('jsonwebtoken');
const prisma = require('../config/database'); 

module.exports = {
  admin: async function (req, res, next) {
    try {
      
      const tokenAdmin = req.cookies.adminToken;
      console.log('Token recebido do cookie:', tokenAdmin); 

      if (!tokenAdmin) {
        return res.status(401).render('erro/sejaAdm', {
          error: 'Você precisa ser um administrador para acessar essa página.',
        });
      }

      
      const decoded = jwt.verify(tokenAdmin, process.env.JWT_SECRET);
      console.log('Token decodificado (Admin):', decoded); 

      
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
        include: {
          role: true, 
        },
      });

      if (!admin) {
        return res.status(403).render('erro/sejaAdm', {
          error: 'Usuário não encontrado. Acesso negado.',
        });
      }

      
      if (admin.role.name !== 'admin') {
        return res.status(403).render('erro/sejaAdm', {
          error: 'Acesso negado. Apenas administradores podem acessar esta rota.',
        });
      }

      
      req.admin = { id: admin.id, role: admin.role.name }; 
      return next();
    } catch (error) {
      console.error('Erro no middleware de autenticação de admin:', error.message);

      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).render('erro/sejaAdm', {
          error: 'Sua sessão expirou. Faça login novamente.',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).render('erro/sejaAdm', {
          error: 'Token inválido. Faça login novamente.',
        });
      }

      
      return res.status(500).render('erro/sejaAdm', {
        error: 'Erro interno no servidor. Tente novamente mais tarde.',
      });
    }
  },
};