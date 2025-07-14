const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRoles() {
    const roles = [
        { 
            id: 1,
            name: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        { 
            id: 2,
            name: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { id: role.id },
            update: { 
                name: role.name,
                updatedAt: new Date() 
            },
            create: role
        });
    }
    console.log('Papéis criados com sucesso!');
}

module.exports = { seedRoles };
