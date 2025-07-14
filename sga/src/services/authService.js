const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const crypto = require('crypto');
const cron = require('node-cron');
const { sendConfirmationEmail, sendPasswordResetEmail } = require('./sendEmail');

class AuthService {
    async findUserByRmAndEtecId(rm, etec) {
        return prisma.user.findFirst({
            where: { rm: String(rm), etec }
        });
    }

    async findUserByEmail(email) {
        return prisma.user.findUnique({
            where: { email },
        });
    }

    async createUser(email, password, nome, sobrenome, rm, etec, tipoEnsino, anoCurso, curso) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('Email já registrado.');
        }
    
        const hashedPassword = await bcrypt.hash(password, 8);
        const token = crypto.randomBytes(20).toString('hex');
    
        const userRole = await prisma.role.findUnique({ where: { id: 2 } });
        if (!userRole) {
            throw new Error('Role com ID 2 não encontrada.');
        }
    
        const user = await prisma.user.create({
            data: {
                rm: String(rm),
                Nome: nome,
                Sobrenome: sobrenome,
                email,
                password: hashedPassword,
                etec,
                curso,
                tipoEnsino,
                anoCurso: anoCurso ? Number(anoCurso) : null,
                emailVerified: false,
                verificationToken: token,
                role: { connect: { id: userRole.id } },
            },
        });
    
        await sendConfirmationEmail(email, token);
        return user;
    }
    

    async verifyPassword(password, hashedPassword) {
        return bcrypt.compare(password , hashedPassword);
    }

    async promoteUsers() {
        await prisma.user.updateMany({
            where: { modulo: 1 },
            data: { modulo: 2 }
        });

        await prisma.user.updateMany({
            where: { modulo: 2 },
            data: { modulo: 3 }
        });
    }

    async requestPasswordReset(email) {
        const user = await this.findUserByEmail(email);
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            await prisma.user.update({
                where: { email },
                data: { resetToken: token },
            });
            await sendPasswordResetEmail(email, token);
            return true;
        }
        return false;
    }

    async resetPassword(token, newPassword) {
        const user = await prisma.user.findFirst({
            where: { resetToken: token },
        });

        if (!user) {
            return false;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 8);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
            },
        });

        return true;
    }

    async verifyEmailToken(token) {
        const user = await prisma.user.findFirst({
            where: { verificationToken: token },
        });

        if (!user) {
            return false;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
            },
        });

        return true;
    }

    async login(rm, password, etec) {
        const user = await this.findUserByRmAndEtecId(rm, etec);

        if (!user) {
            throw new Error('Usuário não encontrado ou ETEC incorreta.');
        }

        if (!user.emailVerified) {
            throw new Error('E-mail não confirmado. Por favor, verifique seu e-mail.');
        }

        const isPasswordValid = await this.verifyPassword(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Senha incorreta.');
        }

        return user;
    }

    async getUserById(userId) {
        try {
            const numericId = parseInt(userId, 10);
            if (isNaN(numericId)) {
                throw new Error('ID do usuário inválido.');
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: numericId
                }
            });

            return user;
        } catch (error) {
            throw new Error(`Erro ao buscar o usuário: ${error.message}`);
        }
    }


    async getUserLockerNumber(userId) {
        try {
            
            const userIdInt = parseInt(userId, 10);
    
            if (isNaN(userIdInt)) {
                throw new Error('ID do usuário inválido');
            }
    
            
            const user = await prisma.user.findUnique({
                where: { id: userIdInt },
                include: { locker: true }, 
            });
    
            
            if (!user) {
                throw new Error('Usuário não encontrado');
            }
    
            if (!user.locker) {
                return 'Nenhum armário alugado'; 
            }
    
            
            return user.locker.numero;
        } catch (error) {
            throw new Error('Erro ao buscar o número do armário: ' + error.message);
        }
    }
}

cron.schedule('0 0 1 */5 *', async () => {
    console.log('Executando promoção de usuários...');
    await AuthService.promoteUsers();
    console.log('Promoção concluída.');
});

module.exports = new AuthService();