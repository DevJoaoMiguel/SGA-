const jwt = require('jsonwebtoken');
const AuthService = require('../services/authService');
const prisma = require("../config/database")

class AuthController {
    
    async login(req, res) {
        const { rm, password, etec } = req.body;
    
        try {
            const user = await AuthService.findUserByRmAndEtecId(rm, etec);
    
            if (!user) {
                throw new Error('Usuário não encontrado ou ETEC incorreta.');
            }
    
            if (!user.emailVerified) {
                throw new Error('E-mail não confirmado. Por favor, verifique seu e-mail.');
            }
    
            const isPasswordValid = await AuthService.verifyPassword(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Senha incorreta.');
            }
    
            const token = jwt.sign(
                { id: user.id, role: 'user', rm: user.rm },
                process.env.JWT_SECRET,
                { expiresIn: '10h' }
            );
    
            res.cookie('userToken', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 10 * 60 * 60 * 1000,
            });
    
            req.session.user = { nome: user.Nome, etec: user.etec };
            return res.redirect('/home');
    
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            return res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
        }
    }
    


    async register(req, res) {
        console.log(req.body);
        const { email, password, Nome, Sobrenome, rm, etec, tipoEnsino, anoCurso,  curso } = req.body;
    
        try {
            if (!email || !password || !Nome || !Sobrenome || !rm || !etec || tipoEnsino === undefined || !curso ) {
                throw new Error('Todos os campos são obrigatórios.');
            }
    
            await AuthService.createUser(email, password, Nome, Sobrenome, rm, etec, tipoEnsino, anoCurso, curso);
            res.render('user/register-success', { message: 'Cadastro realizado! Verifique seu e-mail para ativar a conta.' });
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            res.render('user/register', { error: error.message });
        }
    }

    async renderPerfil(req, res) {
        try {
            const userId = req.user.id; 
            const user = await AuthService.getUserById(userId);
            const lockerNumber = await AuthService.getUserLockerNumber(userId); 
    
            if (!user) {
                return res.status(404).send('Usuário não encontrado.');
            }
    
            res.render('content/perfil', { user, locker: lockerNumber });
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).send('Erro interno no servidor.');
        }
    }

      async uploadFoto(req, res) {
        try {
          const userId = req.user.id; 
          const foto = req.file ? req.file.filename : null;
    
          await prisma.user.update({
            where: { id: userId },
            data: { foto: foto },
          });
    
          res.redirect('/perfil');
        } catch (error) {
          console.error('Erro ao atualizar foto:', error);
          res.status(500).send('Erro ao atualizar foto.');
        }
      }
    
    

    async logout(req, res) {
        try {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Erro ao destruir a sessão:', err);
                    return res.status(500).send('Erro ao fazer logout.');
                }
    
                res.clearCookie('userToken', { path: '/' }); 
                res.clearCookie('connect.sid', { path: '/' });
    
                res.redirect('/login');
            });
        } catch (error) {
            console.error('Erro inesperado no logout:', error);
            res.status(500).send('Erro ao processar o logout.');
        }
    }
    
    async confirmEmail(req, res) {
        const { token } = req.params;
        try {
            const success = await AuthService.verifyEmailToken(token);
            if (success) {
                res.render('user/confirmation-success', { message: 'E-mail confirmado com sucesso! Agora você pode fazer login.' });
            } else {
                res.render('user/confirmation-failed', { error: 'Token inválido ou expirado.' });
            }
        } catch (error) {
            console.error('Erro ao confirmar o e-mail:', error);
            res.render('user/confirmation-failed', { error: 'Erro ao confirmar o e-mail.' });
        }
    }

    async requestPasswordReset(req, res) {
        const { email } = req.body;
        try {
            const success = await AuthService.requestPasswordReset(email);
            if (success) {
                res.render('user/reset-request-success', { message: 'Link para redefinição de senha enviado para seu e-mail.' });
            } else {
                res.render('user/reset-password', { error: 'E-mail não encontrado.' });
            }
        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            res.render('user/reset-password', { error: 'Erro ao processar a solicitação de redefinição.' });
        }
    }

    async resetPassword(req, res) {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.render('user/reset-password-token', { token, error: 'Todos os campos são obrigatórios.' });
        }

        if (password !== confirmPassword) {
            return res.render('user/reset-password-token', { token, error: 'As senhas não coincidem.' });
        }

        try {
            const success = await AuthService.resetPassword(token, password);
            if (success) {
                res.render('user/reset-success', { message: 'Senha redefinida com sucesso! Agora você pode fazer login.' });
            } else {
                res.render('user/reset-password-token', { token, error: 'Token inválido ou expirado.' });
            }
        } catch (error) {
            console.error('Erro ao redefinir a senha:', error);
            res.render('user/reset-password-token', { token, error: 'Erro ao redefinir a senha.' });
        }
    }

    async getUserById(req, res) {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID do usuário é obrigatório.' });
        }
        try {
            const user = await AuthService.getUserById(Number(id));
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({ error: `Erro ao buscar usuário: ${error.message}` });
        }
    }
}

module.exports = new AuthController();
