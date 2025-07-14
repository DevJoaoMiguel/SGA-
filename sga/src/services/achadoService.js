const prisma = require('../config/database');

class AchadoService {
  
  async createAchado(data) {
    const { title, description, image} = data;

    try {
      const product = await prisma.achado.create({
        data: {
          title,
          description,
          image, 
        },
      });

      return product;
    } catch (error) {
      console.error(`Erro ao criar produto: ${error.message}`);
      throw new Error(`Erro ao criar o produto: ${error.message}`);
    }
  }

  
  async getAllAchados() {
    try {
      const achados = await prisma.achado.findMany();
      if (!achados || achados.length === 0) {
        console.log('Nenhum produto encontrado');
      }
      return achados;
    } catch (error) {
      console.error(`Erro ao buscar achados: ${error.message}`);
      throw new Error(`Erro ao buscar achados: ${error.message}`);
    }
  }

  
  async getAchadoById(id) {
    try {
      const achado = await prisma.achado.findUnique({
        where: { id: parseInt(id) }, 
      });

      if (!achado) {
        throw new Error(' Achados não encontrado.');
      }

      return achado;
    } catch (error) {
      console.error(`Erro ao buscar achado: ${error.message}`);
      throw new Error(`Erro ao buscar achado: ${error.message}`);
    }
  }


async updateAchado(id, data) {
  const { title, description, image } = data;

  
  console.log("Dados recebidos para atualização:", data);
  console.log("ID do achado:", id);
  console.log("Título:", title);
  console.log("description:", description);

  
  if (!title) {
    console.error("Validação falhou:", { title});
    throw new Error("Campos obrigatórios estão faltando ou inválidos.");
  }

  try {
    const updatedAchado = await prisma.achado.update({
      where: { id: parseInt(id) },
      data: {
         title,
          description,
          image, 
      },
    });

    console.log("Achado atualizado com sucesso:", updatedAchado);

    return updatedAchado;
  } catch (error) {
    console.error(`Erro ao atualizar Achado: ${error.message}`);
    throw new Error(`Erro ao atualizar Achado: ${error.message}`);
  }
}

  

  
  async deleteAchado(id) {
    try {
      const achado = await prisma.achado.findUnique({
        where: { id: parseInt(id) },
      });

      if (!achado) {
        throw new Error('Achado não encontrado.');
      }

      await prisma.achado.delete({
        where: { id: parseInt(id) },
      });

      return { message: 'Achado deletado com sucesso!' };
    } catch (error) {
      console.error(`Erro ao deletar Achado: ${error.message}`);
      throw new Error(`Erro ao deletar Achado: ${error.message}`);
    }
  }

  
}

module.exports = new AchadoService();
