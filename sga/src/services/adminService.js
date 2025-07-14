const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { sendRegistrationApprovalEmail } = require('../services/emailService');

class AdminService {
    async findUserByAdmin(admin) {
        return prisma.admin.findUnique({
            where: { admin },
        });
    }

    async findUserByEmail(email) {
        return prisma.admin.findUnique({
            where: { email },
        });
    }
    async findUserByEtec(etec) {
        return prisma.admin.findMany({
            where: { etec },
        });
    }


    async getAdminById(id) {
        try {
            return await prisma.admin.findUnique({  
                where: { id },
            });
        } catch (error) {
            throw new Error('Erro ao buscar Admin: ' + error.message);
        }
    }

    async createUser(admin, email, etec, password, approvalToken) {
        const existingAdmin = await prisma.admin.findUnique({ where: { email } });

        if (existingAdmin) {
            throw new Error('Email já registrado como administrador.');
        }

        const hashedPassword = bcrypt.hashSync(password, 8);

        
        let adminRole = await prisma.role.findFirst();
        if (!adminRole) {
            adminRole = await prisma.role.create({
                data: {},
            });
        }

        const newAdmin = await prisma.admin.create({
            data: {
                admin,
                email,
                etec,
                password: hashedPassword,
                approvalToken,
               roleId: 1
            },
        });

        await sendRegistrationApprovalEmail({
            name: admin,
            email,
            etec,
            approvalToken,
        });

        return newAdmin;
    }

    verifyPassword(password, hashedPassword) {
        return bcrypt.compareSync(password, hashedPassword);
    }

    async approved(token) {
        const user = await prisma.admin.findFirst({
            where: { approvalToken: token },
        });

        if (!user) {
            return false;
        }

        await prisma.admin.update({
            where: { id: admin.id },
            data: {
                approved: true,
                approvalToken: null,
            },
        });

        return true;
    }
}

module.exports = new AdminService();
