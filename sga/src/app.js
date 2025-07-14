const express = require("express");
const { seedRoles } = require('./utils/seed');
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const methodOverride = require('method-override');
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const http = require("http");
const ngrok = require('ngrok');  
const socketIo = require("socket.io");
require("dotenv").config();
const cron = require('node-cron');
const RentalNotificationService = require('./services/rentalNotificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Inicialização do Socket.IO
io.on("connection", (socket) => {
    console.log("Novo cliente conectado:", socket.id);

    // Atualiza o status do armário em tempo real
    socket.on("updateLockerStatus", async (data) => {
        try {
            const { lockerId, status } = data;
            const updatedLocker = await prisma.locker.update({
                where: { id: lockerId },
                data: { status },
            });

            // Emite a atualização para todos os clientes
            io.emit("lockerStatusUpdated", updatedLocker);
        } catch (error) {
            console.error("Erro ao atualizar status do armário:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
    });
});

// Chama o seed assim que o app for carregado
async function initializeApp() {
    try {
        await seedRoles();
        console.log('Papéis criados com sucesso!');
    } catch (error) {
        console.error('Erro ao executar o seed:', error);
    }
}

initializeApp();

// Middlewares
app.use(methodOverride('_method'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(
    session({
        secret: process.env.JWT_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);
app.use(cookieParser());

// Limpa o Cache do Navegador
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Template Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware para variáveis globais nas views
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.query = req.query;
    next();
});

app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

app.use((req, res, next) => {
    res.locals.admin = req.admin || null;
    next();
});

// Rotas
app.get("/", (req, res) => {
    res.redirect("/login");
});
app.use(authRoutes);

// Agendar verificação de aluguéis próximos do vencimento (executa todos os dias às 9h)
cron.schedule('0 9 * * *', async () => {
  console.log('Verificando aluguéis próximos do vencimento...');
  await RentalNotificationService.checkExpiringRentals();
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;