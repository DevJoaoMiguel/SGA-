const CorredorService = require('../services/corredorService');

class CorredorController {
  async createCorredor(req, res) {
    try {
        const { corredorNumero, salaNumero, lockerStart, lockerEnd } = req.body;
        const corredor = await CorredorService.createCorredor(corredorNumero, salaNumero, lockerStart, lockerEnd);
        
        res.redirect(`/corredorcriar?success=true&corredor=${corredor.numero}`);
    } catch (error) {
        console.error('Erro ao criar corredor:', error.message);
        res.redirect(`/corredorcriar?error=${encodeURIComponent(error.message)}`);
    }
}




  async getAllCorredores() {
    try {
      return await CorredorService.getAllCorredores();
    } catch (error) {
      throw new Error("Erro ao buscar corredores.");
    }
  }

  async getAllCorredoresGP() {
    try {
      return await CorredorService.getAllCorredoresGP(); 
    } catch (error) {
      throw new Error("Erro ao buscar corredores.");
    }
  }

  async getcriarCorredor(req, res) {
    if (req.session?.userId) {
      return res.redirect('/corredor/add');
    }

    res.render('admin/add_corredor', {
      title: 'Criar Corredor',
      error: req.query.error || null,
    });
  }

  async getCorredorById(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID do corredor é obrigatório.' });
    }

    try {
      const corredor = await CorredorService.getCorredorById(Number(id));
      if (!corredor) {
        return res.status(404).json({ error: 'Corredor não encontrado.' });
      }
      res.status(200).json(corredor);
    } catch (error) {
      res.status(500).json({ error: `Erro ao buscar corredor: ${error.message}` });
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

    
    const existingSala = await prisma.sala.findFirst({
      where: {
        numero: salaNumeroInt,
        corredorId: corredorIdInt,
        NOT: { id: salaIdInt }, 
      },
    });

    if (existingSala) {
      throw new Error(`A sala número ${salaNumeroInt} já existe neste corredor.`);
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

  async updateGetPage(req, res) {
    const { id } = req.params;
    try {
      const corredor = await CorredorService.getCorredorById(id);
      if (!corredor) {
        return res.status(404).render('admin/add_corredor', { corredores: [], error: 'Corredor não encontrado.' });
      }
      const sala = corredor.salas[0];
      const armario = sala.armarios[0];
      res.render('admin/updateCorredor', { corredor, sala, armario, error: null });
    } catch (error) {
      console.error(`Erro ao carregar a página de atualização do corredor: ${error.message}`);
      res.status(500).render('admin/updateCorredor', { corredor: {}, sala: {}, armario: {}, error: 'Erro ao carregar os dados do corredor.' });
    }
  }

  async escolherAluguel(req, res) {
    const { lockerId, salaId, numeroArmario } = req.params;
    const userId = req.session?.userId;

    if (!lockerId || !salaId || !numeroArmario) {
      return res.status(400).json({ error: 'Faltam parâmetros obrigatórios.' });
    }

    try {
      const existingLocker = await CorredorService.getLockerById(userId);
      if (existingLocker) {
        return res.status(400).json({ error: 'Você já possui um armário alugado.' });
      }

      const locker = await CorredorService.findLockerById(lockerId);
      if (!locker) {
        return res.status(404).json({ error: 'Armário não encontrado.' });
      }

      res.render('escolheraluguel', {
        lockerId,
        salaId,
        numeroArmario,
        locker,
      });
    } catch (error) {
      res.status(500).json({ error: `Erro ao buscar o armário: ${error.message}` });
    }
  }

  async deleteCorredor(req, res) {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
        return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
        // Verificar se o corredor existe
        const corredor = await CorredorService.getCorredorById(numericId);

        if (!corredor) {
            return res.status(404).json({ success: false, error: 'Corredor não encontrado.' });
        }

        // Obter todos os lockers do corredor
        const lockers = await CorredorService.getLockersByCorredorId(numericId);
        console.log('Lockers encontrados:', lockers);

        // Verificar se há armários pre-reservados, alugados ou ocupados
        const lockerComStatusIndesejado = lockers.find(locker => 
            locker.status === 'pre-reservado' || 
            locker.status === 'alugado' || 
            locker.status === 'ocupado'
        );

        console.log('Locker com status indesejado:', lockerComStatusIndesejado);

        // Se encontrar armário com status indesejado, impedir a exclusão do corredor
        if (lockerComStatusIndesejado) {
            console.log('❌ Erro: Existe armário pre-reservado, alugado ou ocupado nesse corredor');
            return res.redirect('/corredorcriar?error=Não é possível excluir o corredor. Existem armários pre-reservados, alugados ou ocupados nesse corredor.');
        }

        console.log('✅ Corredor pode ser excluído.');

        // Deletar o corredor, se não houver armários com status indesejado
        await CorredorService.deleteCorredor(numericId);

        res.redirect('/corredorcriar');
    } catch (error) {
        console.error(`Erro ao deletar corredor: ${error.message}`);
        res.status(500).json({ success: false, error: `Erro ao deletar corredor: ${error.message}` });
    }
}



  async updateSala(req, res) {
    const { id } = req.params;
    const data = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID da sala é obrigatório.' });
    }

    try {
      const updatedSala = await CorredorService.updateSala(Number(id), data);
      res.status(200).json(updatedSala);
    } catch (error) {
      res.status(500).json({ error: `Erro ao atualizar sala: ${error.message}` });
    }
  }

  async deleteSala(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID da sala é obrigatório.' });
    }

    try {
      await CorredorService.deleteSala(Number(id));
      res.status(200).json({ message: 'Sala deletada com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: `Erro ao deletar sala: ${error.message}` });
    }
  }

  async updateStatus(req, res){
    const { lockerId, userId, status } = req.body;

    try {
      const result = await CorredorService.updateLockerStatus(lockerId, userId, status);
      console.log("está retornando result", result);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteLocker(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID do armário é obrigatório.' });
    }

    try {
      await CorredorService.deleteLocker(Number(id));
      res.status(200).json({ message: 'Armário deletado com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: `Erro ao deletar armário: ${error.message}` });
    }
  }

  async marcarArmarioComoOcupado(armarioId) {
    try {
      const armario = await prisma.locker.update({
        where: { id: armarioId },
        data: {
          status: 'ocupado',
        },
      });
      return armario;
    } catch (error) {
      throw new Error(`Erro ao atualizar status do armário: ${error.message}`);
    }
  }
}

module.exports = new CorredorController();
