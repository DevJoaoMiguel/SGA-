const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSizes() {
  try {
    const sizes = [
      { name: 'PP' },
      { name: 'P' },
      { name: 'M' },
      { name: 'G' },
      { name: 'GG' },
      { name: 'XG' },
    ];

    for (const size of sizes) {
      await prisma.size.upsert({
        where: { name: size.name },
        update: {},
        create: size,
      });
    }

    console.log('✅ Tamanhos pré-cadastrados inseridos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir tamanhos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSizes(); 