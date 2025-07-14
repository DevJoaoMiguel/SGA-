const jwt = require('jsonwebtoken');
const prisma = require('../config/database'); 

module.exports = {
  auth: async function (req, res, next) {
    try {
      
      const tokenUser = req.cookies.userToken;
      console.log('Token recebido do cookie:', tokenUser); 

      if (!tokenUser) {
        console.log('Nenhum token encontrado no cookie.');
        return res.status(401).render('erro/Façalogin', {
          error: 'Você precisa estar logado para acessar essa página.',
        });
      }

      
      const decoded = jwt.verify(tokenUser, process.env.JWT_SECRET);
      console.log('Token decodificado (User):', decoded); 

      
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          role: true, 
        },
      });

      console.log('Usuário encontrado no banco:', user); 

      if (!user) {
        console.log('Usuário não encontrado no banco de dados.');
        return res.status(403).json({ message: 'Usuário não encontrado. Acesso negado.' });
      }

      
      if (user.role.name !== 'user') {
        console.log('Usuário não tem permissão adequada:', user.role.name);
        return res.status(403).json({ message: 'Acesso negado. Apenas usuários autenticados podem acessar esta rota.' });
      }

      
      req.user = { id: user.id, role: user.role.name };
      console.log('Usuário autenticado com sucesso:', req.user); 

      return next();
    } catch (error) {
      console.error('Erro no middleware de autenticação do usuário:', error.message);

      if (error.name === 'TokenExpiredError') {
        console.log('Token expirado.');
        return res.status(401).render('erro/Façalogin', { 
          error: 'Sua sessão expirou. Faça login novamente.',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        console.log('Token inválido.');
        return res.status(401).render('erro/Façalogin', { 
          error: 'Token inválido. Faça login novamente.',
        });
      }

      console.log('Erro interno no servidor.');
      return res.status(500).render('erro/Façalogin', { 
        error: 'Erro interno no servidor. Tente novamente mais tarde.',
      });
    }

  },
};
