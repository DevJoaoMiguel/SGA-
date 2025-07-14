const prisma = require('../config/database');

class CorredorService {
  async createCorredor(corredorNumero, salaNumero, lockerStart, lockerEnd) {
    try {
      const corredorNumeroInt = parseInt(corredorNumero, 10);
      const salaNumeroInt = parseInt(salaNumero, 10);
      const lockerStartInt = parseInt(lockerStart, 10);
      const lockerEndInt = parseInt(lockerEnd, 10);
  
      if (isNaN(lockerStartInt) || isNaN(lockerEndInt) || lockerStartInt > lockerEndInt) {
        throw new Error('Intervalo de armários inválido');
      }
  
      
      const existingSala = await prisma.sala.findFirst({
        where: {
          numero: salaNumeroInt,  
        },
      });
  
      if (existingSala) {
        throw new Error(`A sala número ${salaNumeroInt} já existe em outro corredor.`);
      }
  
      
      const existingLockers = await prisma.locker.findMany({
        where: {
          numero: {
            gte: lockerStartInt,
            lte: lockerEndInt,
          },
        },
      });
  
      if (existingLockers.length > 0) {
        throw new Error('Alguns armários já existem no intervalo');
      }
  
      
      const corredor = await prisma.corredor.create({
        data: {
          numero: corredorNumeroInt,
          salas: {
            create: {
              numero: salaNumeroInt,
              armarios: {
                create: Array.from({ length: lockerEndInt - lockerStartInt + 1 }, (_, i) => ({
                  numero: lockerStartInt + i,
                })),
              },
            },
          },
        },
        include: {
          salas: {
            include: {
              armarios: true,
            },
          },
        },
      });
  
      
      const salasComArmarios = corredor.salas.map(sala => {
        return {
          ...sala,
          armarios: sala.armarios.map(armario => ({
            ...armario,
            lockerId: armario.id,
          })),
        };
      });
  
      return {
        ...corredor,
        salas: salasComArmarios,
      };
    } catch (error) {
      // Lidar com o erro (por exemplo, logar ou preparar a mensagem)
      console.error('Erro ao criar corredor, sala ou armários:', error.message);
      
      // Se necessário, lançar o erro novamente
      throw new Error(`Erro ao criar corredor, sala ou armários: ${error.message}`);
    }
  }


  
  
  async getAllCorredoresGP() {
    try {
      
      const corredores = await prisma.corredor.findMany({
        include: {
          salas: {
            include: {
              armarios: true, 
            },
          },
        },
      });
  
      
      corredores.sort((a, b) => a.numero - b.numero);
  
      
      const corredoresAgrupados = corredores.reduce((acc, corredor) => {
        const corredorExistente = acc.find(c => c.numero === corredor.numero);
  
        if (corredorExistente) {
          corredor.salas.forEach(sala => {
            const salaExistente = corredorExistente.salas.find(s => s.numero === sala.numero);
            if (salaExistente) {
              sala.armarios.forEach(armario => {
                const armarioExistente = salaExistente.armarios.find(a => a.numero === armario.numero);
                if (!armarioExistente) {
                  
                  salaExistente.armarios.push({
                    ...armario, 
                    lockerId: armario.id, 
                  });
                }
              });
            } else {
              corredorExistente.salas.push(sala);
            }
          });
        } else {
          acc.push({
            id: corredor.id,
            numero: corredor.numero,
            salas: corredor.salas.map(sala => ({
              ...sala,
              armarios: sala.armarios.map(armario => ({
                ...armario,
                lockerId: armario.id,
              })),
            })),
          });
        }
  
        return acc;
      }, []);
  
      
      return corredoresAgrupados;
    } catch (error) {
      throw new Error('Erro ao buscar corredores: ' + error.message);
    }
  }

  async getAllCorredores() {
    try {
      const corredores = await prisma.corredor.findMany({
        include: {
          salas: {
            include: {
              armarios: true,
            },
          },
        },
      });

      
      corredores.sort((a, b) => a.numero - b.numero);

      
      corredores.forEach(corredor => {
        
        corredor.salas.sort((a, b) => a.numero - b.numero);
        
        
        corredor.salas.forEach(sala => {
          sala.armarios.sort((a, b) => a.numero - b.numero);
        });
      });

      
      return corredores;
    } catch (error) {
      throw new Error('Erro ao buscar corredores: ' + error.message);
    }
  }

  async deleteCorredor(id) {
    try {
      const corredorId = parseInt(id);
      
  
      const corredor = await prisma.corredor.findUnique({
        where: { id: corredorId },
      });
  
      if (!corredor) {
        throw new Error('Corredor não encontrado.');
      }
  
      await prisma.corredor.delete({
        where: { id: corredorId },
      });
  
      return { message: 'Corredor deletado com sucesso!' };
    } catch (error) {
      console.error(`Erro ao deletar corredor: ${error.message}`);
      throw new Error(`Erro ao deletar corredor: ${error.message}`);
    }
  }
  

  async getCorredorById(id) {
    try {
      
      const corredorIdInt = parseInt(id, 10);

      
      if (isNaN(corredorIdInt)) {
        throw new Error('ID do corredor inválido');
      }

      return await prisma.corredor.findUnique({
        where: {
          id: corredorIdInt, 
        },
        include: {
          salas: {
            include: {
              armarios: true,
            },
          },
        },
      });
    } catch (error) {
      throw new Error('Erro ao buscar corredor: ' + error.message);
    }
  }

  async findLockerByNumber(lockerNumero) {
    try {
      const lockerNumeroInt = parseInt(lockerNumero, 10); 
      const locker = await prisma.locker.findUnique({
        where: {
          numero: lockerNumeroInt,  
        },
      });

      return locker; 
    } catch (error) {
      throw new Error(`Erro ao buscar armário: ${error.message}`);
    }
  }

  async findLockerById(lockerId) {
    if (!lockerId) {
        throw new Error("O lockerId é necessário");
    }

    const parsedLockerId = parseInt(lockerId, 10); 
    if (isNaN(parsedLockerId)) {
        throw new Error("ID do armário inválido");
    }

    try {
        const locker = await prisma.locker.findUnique({
            where: {
                id: parsedLockerId,
            },
        });
        if (!locker) {
            throw new Error("Armário não encontrado");
        }

        return locker;
    } catch (error) {
        throw new Error("Erro ao buscar armário pelo ID: " + error.message);
    }
  }


async updateLockerStatus(lockerId, userId, status){
  try {
    
    await prisma.locker.update({
      where: { id: lockerId },
      data: {
        status: status,
        userId: status === 'pago' ? userId : null,  
      },
    });
    console.log("está retornando data ", data);

    
    if (status === 'pago') {
      await prisma.locker.updateMany({
        where: {
          userId: { not: userId },
          status: 'disponível',
        },
        data: {
          status: 'alugado',
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    throw new Error('Erro ao atualizar o status.');
  }
}


  async updateCorredor(corredorId, salaId, armarioId, data) {
    const { corredorNumero, salaNumero, armarioNumero, status } = data; 
  
    try {
      
      const corredorNumeroInt = parseInt(corredorNumero, 10);
      const salaNumeroInt = parseInt(salaNumero, 10);
      const armarioNumeroInt = parseInt(armarioNumero, 10);
  
      
      const corredorIdInt = parseInt(corredorId, 10);
      const salaIdInt = parseInt(salaId, 10);
      const armarioIdInt = parseInt(armarioId, 10);
  
      
      if (isNaN(corredorIdInt) || isNaN(salaIdInt) || isNaN(armarioIdInt) || isNaN(armarioNumeroInt)) {
        throw new Error('IDs ou números fornecidos são inválidos.');
      }
  
      
      const updatedCorredor = await prisma.corredor.update({
        where: { id: corredorIdInt },
        data: {
          numero: corredorNumeroInt,
          salas: {
            update: {
              where: { id: salaIdInt },
              data: {
                numero: salaNumeroInt,
                armarios: {
                  update: {
                    where: { id: armarioIdInt },
                    data: {
                      numero: armarioNumeroInt,
                      status, 
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updatedCorredor; 
    } catch (error) {
      throw new Error('Erro ao atualizar corredor: ' + error.message);
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
 async getLockerById(salaId) {
    try {
      const id = parseInt(salaId, 10);

      if (isNaN(id)) {
        throw new Error('ID do armário inválido');
      }

      return await prisma.sala.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new Error('Erro ao buscar sala: ' + error.message);
    }
  }


  async getLockersByCorredorId(corredorId) {
    try {
        const id = parseInt(corredorId, 10);

        if (isNaN(id)) {
            throw new Error('ID do corredor inválido');
        }

        
        const corredor = await prisma.corredor.findUnique({
            where: { id },
            include: {
                salas: {
                    include: {
                        armarios: true, 
                    },
                },
            },
        });

        if (!corredor) {
            throw new Error('Corredor não encontrado.');
        }

        
        const armarios = corredor.salas.flatMap(sala => sala.armarios);

        return armarios;
    } catch (error) {
        throw new Error('Erro ao buscar armários do corredor: ' + error.message);
    }
}

  
}

module.exports = new CorredorService();
