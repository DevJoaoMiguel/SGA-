const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garantir que a pasta 'uploads' exista
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Cria a pasta 'uploads' se não existir
  console.log('Pasta "uploads" criada com sucesso!');
}

// Definindo o destino do arquivo e o nome do arquivo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // A pasta onde as imagens serão armazenadas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Gerar um nome único para o arquivo
  }
});

// Filtrando apenas arquivos de imagem
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

// Configurando o multer
const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
