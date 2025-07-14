const adminService = require('../services/adminService');
const rental = require('../services/rentalService')
const { sendRegistrationApprovalEmail } = require('../services/emailService');
const { generateToken } = require('../utils/tokenGenerator');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

exports.postLogin = async (req, res) => {
    const { email, password, etec } = req.body;

    if (!email || !etec) {
        return res.redirect('/loginAdm?error=Requer email e etec');
    }

    try {
        const user = await adminService.findUserByEmail(email);
        if (!user) {
            return res.redirect('/loginAdm?error=Usuario não encontrado');
        }
        if (!user.approved) {
            throw new Error('E-mail não confirmado. Espere nossa equipe aprova-lo.');
        }

        const isPasswordValid = await adminService.verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.redirect('/loginAdm?error=senha invalida , tente novamente');
        }

        const etecUser = await adminService.findUserByEtec(etec);
        if (!etecUser) {
            return res.redirect('/loginAdm?error=etec invalida');
        }

        if (user.role === 'admin' && !user.approved) {
            return res.redirect('/loginAdm?error=não aprovado');
        }

        const token = jwt.sign(
            { id: user.id, role: 'admin', email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '10h' }
        );

        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: false, 
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, 
        });

        req.session.admin = { admin: user.admin, etec: user.etec };     

        return res.redirect('/homeadm');
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.redirect('/loginAdm?Email ou senha invalida , tente novamente');
    }
};


exports.renderPerfil = async (req, res) => {
    try {
      const adminId = req.admin.id; 
      const admin = await adminService.getAdminById(adminId);
      
      if (!admin) {
        return res.status(404).send('Admin não encontrado.');
      }
  
      const lockerReport = await rental.getLockerReport();
  
      res.render('admin/perfiladm', { admin, lockerReport });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).send('Erro interno no servidor.');
    }
  }

  exports.uploadFoto = async (req, res) =>{
    try {
      const adminId = req.admin.id; 
      const foto = req.file ? req.file.filename : null; 

      await prisma.admin.update({
        where: { id: adminId },
        data: { foto: foto },
      });

      res.redirect('/perfiladm');
    } catch (error) {
      console.error('Erro ao atualizar foto:', error);
      res.status(500).send('Erro ao atualizar foto.');
    }
  }



exports.logout = (req, res) => {
    res.clearCookie('adminToken'); 
    res.redirect('/loginAdm');
};

exports.getRegister = (req, res) => {
    if (req.session.userId) {
        return res.redirect('/homeadm');
    }
    res.render('admin/registerAdm', {
        title: 'Registrar-se',
        error: req.query.error || null,
    });
};

exports.postRegister = async (req, res) => {
    const { admin, email, etec, password } = req.body;

    try {
        const approvalToken = generateToken();
        const user = await adminService.createUser(admin, email, etec, password, approvalToken);

        await sendRegistrationApprovalEmail(user);

        res.render('user/register-successadm', { message: 'Cadastro realizado! Espere nossa equipe aprova-lo.' });
    } catch (error) {
        console.error('Erro ao registrar administrador:', error.message);
        res.redirect('/registerAdm?error=unknown');
    }
};

exports.approveUser = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await prisma.admin.findFirst({
            where: { approvalToken: token },
        });

        if (!user) {
            return res.status(404).send('Usuário não encontrado.');
        }

        const updatedUser = await prisma.admin.update({
            where: { id: user.id },
            data: { approved: true, approvalToken: null },
        });

        res.send(`<h3>O usuário ${updatedUser.admin} foi aprovado com sucesso.</h3>`);
    } catch (error) {
        console.error('Erro ao aprovar usuário:', error.message);
        res.status(500).send('Erro ao aprovar usuário.');
    }
};

exports.rejectUser = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await prisma.admin.delete({
            where: { approvalToken: token },
        });

        res.send(`<h3>O usuário ${user.admin} foi rejeitado com sucesso.</h3>`);
    } catch (error) {
        console.error('Erro ao rejeitar usuário:', error.message);
        res.status(500).send('Erro ao rejeitar usuário.');
    }
};
