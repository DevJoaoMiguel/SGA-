# Sistema de Gestão Acadêmica (SGA)

## 📋 Sobre o Projeto

O Sistema de Gestão Acadêmica (SGA) é uma aplicação web desenvolvida para gerenciar serviços acadêmicos como loja de produtos, sistema de achados e perdidos, e aluguel de armários. O sistema oferece uma plataforma completa para estudantes e funcionários da instituição.

## 🚀 Tecnologias Utilizadas

- **Backend:**
  - Node.js
  - Express.js
  - Prisma (ORM)
  - Socket.IO (comunicação em tempo real)

- **Frontend:**
  - EJS (Template Engine)
  - HTML/CSS/JavaScript
  - Toastr (notificações)

- **Banco de Dados:**
  - MYSQL (via Prisma)

- **Integrações:**
  - MercadoPago (processamento de pagamentos)
  - Nodemailer (envio de emails)
  - Ngrok (túnel para webhooks)

## 🗄️ Estrutura do Banco de Dados

### 1. Usuários e Autenticação
- **User**
  - Informações básicas: RM, email, senha, nome, sobrenome
  - Dados acadêmicos: curso, ano, tipo de ensino (ENSINO_MEDIO/TECNICO)
  - Controle de acesso: roleId, emailVerified, verificationToken
  - Relacionamentos: armário alugado, pedidos, pagamentos

- **Admin**
  - Dados de acesso: admin, email, senha
  - Controle de aprovação: approved, approvalToken
  - Perfil: roleId, etec, foto

- **Role**
  - Definição de papéis: name
  - Relacionamentos: users, admins

### 2. Loja de Produtos
- **Product**
  - Informações do produto: title, price, typeroupas
  - Imagem: image
  - Controle de pagamento: paymentId, preferenceId
  - Relacionamentos: stocks, pedidos, payments

- **Stock**
  - Controle de estoque: productId, tamanho, quantidade
  - Relacionamento: product

- **Pedido**
  - Dados do pedido: userId, produtoId, quantidade, tamanho
  - Informações do cliente: nome, email, rm
  - Status: pendente, entregue, cancelado
  - Relacionamentos: user, produto

### 3. Sistema de Achados e Perdidos
- **Achado**
  - Descrição: title, description
  - Imagem: image
  - Controle temporal: createdAt, updatedAt

### 4. Aluguel de Armários
- **Locker**
  - Identificação: numero
  - Localização: salaId
  - Status: livre, ocupado
  - Relacionamentos: sala, user, rentals

- **Sala**
  - Identificação: numero
  - Localização: corredorId
  - Relacionamentos: corredor, armarios

- **Corredor**
  - Identificação: numero
  - Relacionamentos: salas

- **Rental**
  - Período: startDate, endDate
  - Tipo: rentType
  - Status: pendente, ativo, encerrado
  - Pagamento: price, paymentId, preferenceId
  - Relacionamentos: locker, user, payment

### 5. Pagamentos
- **Pagamento**
  - Detalhes: status, precoUnitario, quantidade, precoTotal
  - Relacionamentos: user, product, rentals

## 🛠️ Estrutura do Projeto

```
src/
├── config/         # Configurações do sistema
├── controllers/    # Controladores da aplicação
├── middleware/     # Middlewares do Express
├── model/         # Modelos de dados
├── public/        # Arquivos estáticos (CSS, JS, imagens)
├── routes/        # Rotas da aplicação
├── scripts/       # Scripts utilitários
├── services/      # Serviços da aplicação
├── uploads/       # Arquivos enviados pelos usuários
├── utils/         # Funções utilitárias
├── views/         # Templates EJS
├── app.js         # Configuração principal do Express
├── multer.js      # Configuração do upload de arquivos
└── server.js      # Ponto de entrada da aplicação
```

## ⚙️ Funcionalidades Principais

### 1. Loja de Produtos
- **Catálogo de Produtos**
  - Cadastro de produtos com descrição detalhada
  - Upload de fotos dos produtos
  - Categorização dos produtos
  - Controle de estoque
  - Preços e promoções

- **Gestão de Vendas**
  - Carrinho de compras
  - Processamento de pedidos
  - Histórico de compras
  - Notificações de status do pedido
  - Comprovante de compra

- **Pagamentos**
  - Integração com MercadoPago
  - Múltiplas formas de pagamento
  - Confirmação automática de pagamento
  - Reembolsos e cancelamentos

### 2. Sistema de Achados e Perdidos
- **Cadastro de Itens**
  - Registro de itens encontrados com descrição detalhada
  - Upload de fotos dos itens
  - Categorização dos itens
  - Data e local onde o item foi encontrado

- **Gestão de Itens**
  - Listagem de todos os itens cadastrados
  - Filtros por categoria, data e status
  - Atualização do status dos itens (encontrado/devolvido)
  - Histórico de devoluções

- **Reivindicação de Itens**
  - Sistema de solicitação de itens perdidos
  - Verificação de propriedade
  - Notificações por email sobre itens encontrados
  - Comprovante de devolução

### 3. Aluguel de Armários
- **Gestão de Armários**
  - Cadastro de armários disponíveis
  - Identificação única para cada armário
  - Status de disponibilidade
  - Localização física dos armários

- **Processo de Aluguel**
  - Seleção de armário disponível
  - Contrato de aluguel digital
  - Pagamento via MercadoPago
  - Geração de comprovante

- **Controle de Acesso**
  - Registro de chaves
  - Histórico de aluguéis
  - Renovação de contrato
  - Devolução de armário

- **Notificações**
  - Alertas de vencimento de contrato
  - Lembretes de pagamento
  - Confirmação de renovação
  - Avisos de devolução

## 🔧 Instalação e Configuração

1. **Clone o repositório:**
```bash
git clone [url-do-repositorio]
cd sga
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
DATABASE_URL="sua-url-do-banco-de-dados"
JWT_SECRET="seu-segredo-jwt"
MERCADOPAGO_ACCESS_TOKEN="seu-token-mercadopago"
EMAIL_USER="seu-email"
EMAIL_PASS="sua-senha-email"
```

4. **Execute as migrações do banco de dados:**
```bash
npx prisma migrate dev
```

5. **Inicie o servidor:**
```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm start
```

## 📦 Scripts Disponíveis

- `npm start`: Inicia o servidor em modo produção
- `npm run dev`: Inicia o servidor em modo desenvolvimento com hot-reload

## 🔐 Dependências Principais

- `@prisma/client`: ORM para banco de dados
- `express`: Framework web
- `bcrypt`: Criptografia de senhas
- `jsonwebtoken`: Autenticação JWT
- `mercadopago`: Integração com pagamentos
- `nodemailer`: Envio de emails
- `socket.io`: Comunicação em tempo real
- `multer`: Upload de arquivos
- `ejs`: Template engine

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Autores

- Seu Nome - [GitHub](link-do-github)

## 📞 Suporte

Para suporte, envie um email para [seu-email@dominio.com]