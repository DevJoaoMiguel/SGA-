const prisma = require('../config/database');
const cron = require('node-cron');

class RentalService {
  async createRental(lockerId, userId, rentType) {
    return await prisma.$transaction(async (prisma) => {
      const locker = await prisma.locker.findUnique({
        where: {
          id: parseInt(lockerId)
        }
      });

      if (!locker || locker.status !== 'livre') {
        throw new Error('Armário não disponível');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      let duration;
      let price;

      if (rentType === 'period') {
        duration = 5 * 30; // 5 meses
        price = 50;        // Preço para período
      } else if (rentType === 'year') {
        duration = 365;    // Um ano
        price = 100;       // Preço para ano
      } else {
        throw new Error('Tipo de aluguel inválido. Use "period" ou "year".');
      }

      const rental = await prisma.rental.create({
        data: {
          lockerId,
          userId,
          startDate: new Date(),
          endDate: this.calculateEndDate(duration),
          rentType,
          price,
          status: 'pre-reservado', 
        },
      });
      return rental;
    });
  }

  calculateEndDate(duration) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration);
    return endDate;
  }


  async confirmPayment(paymentId) {
    try {
      const rentalId = await this.getRentalIdByPaymentId(paymentId);

      if (!rentalId) {
        throw new Error('Nenhum aluguel encontrado para esse Payment ID.');
      }

      // Atualizar status do aluguel para "ativo"
      await prisma.rental.update({
        where: { id: rentalId },
        data: { status: 'ativo' },
      });

      // Atualizar status do armário para "ocupado"
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
      });

      await prisma.locker.update({
        where: { id: rental.lockerId },
        data: { status: 'ocupado' },
      });

      console.log('Pagamento confirmado. Aluguel e armário atualizados.');
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      throw new Error('Erro ao confirmar pagamento.');
    }
  }

  async getAllRental() {
    try {
      return await prisma.rental.findMany({
        include: {
          locker: true, // Inclui os dados do armário
          user: true,   // Inclui os dados do usuário
        },
      });
    } catch (error) {
      throw new Error('Erro ao buscar aluguéis: ' + error.message);
    }
  }

  async getRentalById(id) {
    try {
      return await prisma.rental.findUnique({
        where: { id: Number(id) },
        include: {
          locker: true,
          user: true,
        },
      });
    } catch (error) {
      throw new Error('Erro ao buscar aluguel: ' + error.message);
    }
  }

  async updateRental(id, data) {
    try {
      return await prisma.rental.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new Error('Erro ao atualizar aluguel: ' + error.message);
    }
  }

  async deleteRental(id) {
    try {
      const rental = await prisma.rental.delete({
        where: { id },
      });

      await prisma.locker.update({
        where: { id: rental.lockerId },
        data: { status: 'disponivel' },
      });

      return rental;
    } catch (error) {
      throw new Error(`Erro ao deletar aluguel: ${error.message}`);
    }
  }

  async getAvailableLockers() {
    try {
      return await prisma.locker.findMany({
        where: { status: 'disponivel' },
        select: { id: true, numero: true, status: true, price: true }
      });
    } catch (error) {
      console.error('Erro ao buscar armários:', error);
      throw new Error('Erro ao buscar armários disponíveis');
    }
  }

  async updatePreferenceId(rentalId, preferenceId) {
    try {
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
      });

      if (!rental) {
        throw new Error('Aluguel não encontrado');
      }

      const updatedRental = await prisma.rental.update({
        where: { id: rentalId },
        data: { preferenceId },
      });

      console.log('Preference ID atualizado com sucesso para o aluguel:', updatedRental);

      return updatedRental;
    } catch (error) {
      console.error('Erro ao atualizar Preference ID:', error);
      throw new Error(`Erro ao atualizar Preference ID: ${error.message}`);
    }
  }

  async getLockerById(lockerId) {
    try {
      const id = parseInt(lockerId, 10);

      if (isNaN(id)) {
        throw new Error('ID do armário inválido');
      }

      return await prisma.locker.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new Error('Erro ao buscar armário: ' + error.message);
    }
  }

  async updatePaymentId(rentalId, paymentId) {
    try {
      const rental = await prisma.rental.findUnique({
        where: { id: rentalId },
      });

      if (!rental) {
        throw new Error('Aluguel não encontrado');
      }

      return await prisma.rental.update({
        where: { id: rentalId },
        data: { paymentId: parseInt(paymentId) },
      });
    } catch (error) {
      console.error('Erro ao associar Payment ID:', error);
      throw new Error('Erro ao associar Payment ID');
    }
  }

  async getRentalIdByPaymentId(paymentId) {
    try {
      const rental = await prisma.rental.findFirst({
        where: { paymentId: parseInt(paymentId) },
      });

      if (!rental) {
        throw new Error('Aluguel não encontrado');
      }

      return rental.id;
    } catch (error) {
      throw new Error('Erro ao buscar aluguel pelo Payment ID: ' + error.message);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.KEYMP}`,
        },
      });

      const data = await response.json();
      return data.status;
    } catch (error) {
      throw new Error(`Erro ao verificar status do pagamento: ${error.message}`);
    }
  }

  async updateRentalStatus(rentalId, status) {
    try {
      const updatedRental = await prisma.rental.update({
        where: { id: rentalId },
        data: { status },
      });
      return updatedRental;
    } catch (error) {
      throw new Error(`Erro ao atualizar status do aluguel: ${error.message}`);
    }
  }

  async updateLockerStatus(lockerId, status) {
    try {
      const updatedLocker = await prisma.locker.update({
        where: { id: lockerId },
        data: { status },
      });
      return updatedLocker;
    } catch (error) {
      throw new Error(`Erro ao atualizar status do armário: ${error.message}`);
    }
  }

async getLockerReport() {
  try {
    const rentedLockers = await prisma.locker.count({
      where: { status: 'ocupado' }
    });

    const availableLockers = await prisma.locker.count({
      where: { status: 'livre' }
    });

    return {
      alugados: rentedLockers,
      disponiveis: availableLockers
    };
  } catch (error) {
    console.error('Erro ao gerar relatório de armários:', error);
    throw new Error('Erro ao gerar relatório');
  }
}
}


async function liberarArmariosExpirados() {
  try {
    const alugueisExpirados = await prisma.rental.findMany({
      where: {
        status: 'ativo',
        endDate: { lt: new Date() } 
      }
    });

    for (const aluguel of alugueisExpirados) {
      await prisma.rental.update({
        where: { id: aluguel.id },
        data: { status: 'finalizado' }
      });

      await prisma.locker.update({
        where: { id: aluguel.lockerId },
        data: { status: 'livre' }
      });

      
      await prisma.user.update({
        where: { id: aluguel.userId },
        data: { lockerId: null }
      });

      console.log(`Armário ${aluguel.lockerId} liberado para o usuário ${aluguel.userId}`);
    }
  } catch (error) {
    console.error('Erro ao liberar armários expirados:', error);
  }

}


cron.schedule('0 0 * * 0', async () => {
  console.log('🔄 Verificando pré reservas expirados...');
  await liberarArmariosExpirados();
});

module.exports = new RentalService();
