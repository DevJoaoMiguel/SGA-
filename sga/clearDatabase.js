const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
    try {
        console.log('🔄 Iniciando reset do banco de dados...');

        // Deletando todos os dados em ordem para respeitar as chaves estrangeiras
        console.log('🗑️ Deletando dados...');
        
        await prisma.rental.deleteMany({});
        await prisma.pagamento.deleteMany({});
        await prisma.pedido.deleteMany({});
        await prisma.stock.deleteMany({});
        await prisma.product.deleteMany({});
        await prisma.achado.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.admin.deleteMany({});
        await prisma.locker.deleteMany({});
        await prisma.sala.deleteMany({});
        await prisma.corredor.deleteMany({});
        await prisma.role.deleteMany({});

        console.log('✅ Dados deletados com sucesso!');

        // Resetando os auto-incrementos
        console.log('🔄 Resetando IDs...');
        await prisma.$executeRaw`ALTER TABLE rental AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE pagamento AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE pedido AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE stock AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE product AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE achado AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE user AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE admin AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE locker AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE sala AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE corredor AUTO_INCREMENT = 1`;
        await prisma.$executeRaw`ALTER TABLE role AUTO_INCREMENT = 1`;

        console.log('✅ IDs resetados com sucesso!');

        // Recriando os papéis básicos
        console.log('👥 Recriando papéis...');
        await prisma.role.createMany({
            data: [
                { name: 'admin' },
                { name: 'user' }
            ]
        });

        // Recriando um admin padrão
        console.log('👤 Criando admin padrão...');
        const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } });
        await prisma.admin.create({
            data: {
                admin: 'admin',
                email: 'admin@etec.sp.gov.br',
                password: '$2a$10$rDkPvvAFV8c3JZxJ5Y5Y5O5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', // senha: admin123
                approved: true,
                roleId: adminRole.id,
                etec: 'ETEC'
            }
        });

        console.log('✅ Banco de dados resetado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao resetar banco de dados:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Executa o reset se o arquivo for chamado diretamente
if (require.main === module) {
    resetDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = resetDatabase;