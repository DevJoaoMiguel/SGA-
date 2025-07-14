const AchadoService = require('../services/achadoService'); 
const AuthService = require('../services/authService');

class AchadoController {
  
  async createAchado(req, res) {
    const { title, description } = req.body;
    const image = req.file ? req.file.filename : null; 

    console.log(req.body); 

   
    if (!title || !description || !image) {
      return res.status(400).json({ success: false, error: 'Preencha todos os campos, incluindo a imagem.' });
    }

    try {
      const newAchado = await AchadoService.createAchado({ title, description, image });

      if (!newAchado) {
        return res.status(500).json({ success: false, error: 'Erro ao adicionar achado.' });
      }

      res.redirect('/achadoadm');
    } catch (error) {
      console.error(`Erro ao criar achado: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao adicionar achado: ${error.message}` });
    }
  }


  async getAchadoforDetails(req, res) {
        try {
          const id = req.params.id;
          const userId = req.user.id;
          const achado = await AchadoService.getAchadoById(Number(id));
    
          if (!achado) {
            return res.status(404).send("achado não encontrado");
          }
    
          res.render("achados/Detalhesachado", { achado ,userId});
        } catch (error) {
          console.error("Erro ao buscar achado:", error);
          res.status(500).send("Erro ao buscar achado");
        }
      }
  

  async getAllAchadosForAdmin(req, res) {
    try {
      const achados = await AchadoService.getAllAchados();
      const admin = req.session.admin || null; 

      res.render('achados/achadodm', { achados, admin, error: null });
    } catch (error) {
      console.error(`Erro ao buscar achados: ${error.message}`);
      res.status(500).render('achados/achadodm', { achados: [], admin: null, error: 'Erro ao carregar achados.' });
    }
  }

  async getAllAchadosForShop(req, res) {
    try {
      const achados = await AchadoService.getAllAchados();
      const user = req.session.user || null; 
      res.render('achados/achado', { achados, user, error: null });
    } catch (error) {
      console.error(`Erro ao buscar achados: ${error.message}`);
      res.status(500).render('achados/achado', { achados: [], user: null, error: 'Erro ao carregar achados.' });
    }
  }

  async getAchadoById(req, res) {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      const achado = await AchadoService.getAchadoById(numericId);

      if (!achado) {
        return res.status(404).json({ success: false, error: 'Achado não encontrado.' });
      }
      res.status(200).json({ success: true, achado });
    } catch (error) {
      console.error(`Erro ao carregar o achado: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao carregar o achado: ${error.message}` });
    }
  }

  async getUpdateAchadoPage(req, res) {
    const { id } = req.params;
    try {
      const achado = await AchadoService.getAchadoById(id);

      if (!achado) {
        return res.status(404).render('achados/achadodm', { achados: [], error: 'Achado não encontrado.' });
      }

      res.render('achados/updateachado', { achado, error: null });
    } catch (error) {
      console.error(`Erro ao carregar a página de atualização do achado: ${error.message}`);
      res.status(500).render('achados/updateachado', { achado: {}, error: 'Erro ao carregar os dados do achado.' });
    }
  }

  
  async updateAchado(req, res) {
    const { id } = req.params;
    const data = req.body;
    const numericId = Number(id);
    const image = req.file ? req.file.filename : null;
    

    console.log("📥 Dados recebidos no body:", data);
    console.log("🆔 ID recebido:", numericId);
    console.log("🖼️ Imagem recebida:", image);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      if (image) {
        data.image = image;
      }
      const achados = await AchadoService.getAllAchados();
      const updatedAchado = await AchadoService.updateAchado(numericId, data);

      if (!updatedAchado) {
        return res.status(404).json({ success: false, error: 'Achado não encontrado.' });
      }

      
      res.redirect('/achadoadm');
    } catch (error) {
      console.error(`❌ Erro ao atualizar achado: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao atualizar achado: ${error.message}` });
    }
  }

  async deleteAchado(req, res) {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, error: 'ID inválido.' });
    }

    try {
      const result = await AchadoService.deleteAchado(numericId);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Achado não encontrado.' });
      }

      res.redirect('/achadoadm'); 
    } catch (error) {
      console.error(`Erro ao deletar achado: ${error.message}`);
      res.status(500).json({ success: false, error: `Erro ao deletar achado: ${error.message}` });
    }
  }
}

module.exports = new AchadoController();