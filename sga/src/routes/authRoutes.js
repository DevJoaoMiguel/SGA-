const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database")
const AuthController = require("../controllers/authController");
const AdminController = require("../controllers/adminController");
const { auth } = require("../middleware/requireAuth");
const { admin } = require("../middleware/requireAdmin");
const CorredorController = require("../controllers/corredorController");
const ProductController = require("../controllers/productController");
const ShopController = require("../controllers/shopController");
const RentalController = require("../controllers/rentalController");
const AchadoController = require('../controllers/achadoController');
const DashboardController = require('../controllers/dashboardController');

const upload = require("../multer"); 
const router = express.Router();
const PedidoController = require('../controllers/pedidoController');

router.get("/financeiro", admin, (req, res) => {
    res.render("admin/homefinanceiro", { error: null });
});

router.get("/dashboard-financeiro", admin, (req, res) => DashboardController.getDashboardFinanceiro(req, res));

router.get("/api/dashboard/lockers", admin, (req, res) => DashboardController.getDashboardLockers(req, res));

router.get('/admin/dashboard', admin, (req, res) => DashboardController.showDashboard(req, res));

router.get("/loginAdm", (req, res) => {
    res.render("admin/loginAdm", { title: "Login", error: req.query.error || null });
});

router.post("/loginAdm", AdminController.postLogin);
router.get("/registerAdm", AdminController.getRegister);
router.post("/registerAdm", AdminController.postRegister);
router.get("/approve/:token", AdminController.approveUser);
router.get("/reject/:token", AdminController.rejectUser);
router.get("/logoutAdm", AdminController.logout);


router.get("/login", (req, res) => {
    res.render("user/login", { error: null });
});

router.get("/home", auth, (req, res) => {
    res.render("content/home", { error: null, isAdmin: req.isAdmin, isUser: req.isUser });
});

router.get("/homeadm", admin, (req, res) => {
    res.render("admin/homeadm", { error: null });
});

router.get("/success",  (req, res) => {
  res.render("content/success", { error: null });
});

router.get("/failure", (req, res) => {
  res.render("content/falha", { error: null });
});

router.get("/pending", (req, res) => {
  res.render("content/pendente", { error: null });
});

router.post("/login", async (req, res, next) => {
    try {
        await AuthController.login(req, res);
    } catch (error) {
        next(error);
    }
});

router.get("/register", (req, res) => {
    res.render("user/register", { error: null });
});

router.post("/register", AuthController.register);
router.get("/reset-password", (req, res) => {
    res.render("user/reset-password", { error: null });
});
router.post("/reset-password", AuthController.requestPasswordReset);
router.get("/reset-password/:token", (req, res) => {
    res.render("user/reset-password-token", { token: req.params.token, error: null });
});
router.post("/reset-password/:token", AuthController.resetPassword);
router.get("/confirm/:token", AuthController.confirmEmail);
router.get("/logout", AuthController.logout);


router.get("/corredordelete/:id", CorredorController.deleteCorredor);
router.get("/corredoradm", admin, async (req, res) => {
   const admin = req.session.admin
   const user = req.session.user

    try {
        const corredores = await CorredorController.getAllCorredoresGP();
        const armarios = await CorredorController.getAllCorredoresGP();
        res.render('admin/lockeradm', { corredores, armarios, admin, user });
    } catch (error) {
        console.error("Erro ao buscar armários:", error);
        res.status(500).render('admin/lockeradm', { corredores: [], armarios: [], error: "Erro ao carregar armários." });
    }
});

router.get("/corredores", async (req, res) => {
    const user =req.session.user ;
    
    try {
        const corredores = await CorredorController.getAllCorredoresGP();
        const corredoresProcessados = corredores.map(corredor => {
            corredor.status = corredor.salas.length > 0 ? "Com salas" : "Sem salas";
            return corredor;
        });
        res.render("content/locker", { corredores: corredoresProcessados || [],user, error: null });
    } catch (error) {
        console.error(error);
        res.render("content/locker", { corredores: [], error: "Erro ao carregar dados" });
    }
});

router.get("/corredorcriar", admin,async (req, res) => {
    try { 
        const admin = req.session.admin ;
        const corredores = await CorredorController.getAllCorredores();
        res.render("admin/add_corredor", { corredores,admin  });
    } catch (error) {
        res.render("admin/add_corredor", { corredores: [], error: "Erro ao carregar dados" });
    }
});

router.post("/corredor/add", CorredorController.createCorredor);


router.get("/lojaadm", admin, ProductController.getAllProductsForAdmin);

router.get("/loja", auth,  (req, res) => {
    ProductController.getAllProductsForShop(req, res, (products) => {
        res.render("shop/loja", { error: null, products });
    });
});
router.post('/purchaseproduct', auth, ProductController.purchaseProduct)

router.get("/detalhes/:id", auth,  (req, res) => {
    ProductController.getProductsforDetails(req, res, (products) => {
        res.render('shop/Detalhesproduct', { products });
    });
});
router.get('/deleteproduct/:id', ProductController.deleteProduct);
router.get('/updateproduct/:id', ProductController.getUpdateProductPage);
router.post('/updateproduct/:id', ProductController.updateProduct);



router.post("/productadd", upload.single("image"), ProductController.createProduct);





router.post('/rental/add', RentalController.createRental);
router.get("/rental", auth, RentalController.getAllRental);
router.get("/rental/:id", auth, RentalController.getRentalById);
router.put("/rental/:id", auth, RentalController.updateRental);
router.delete("/rental/:id", auth, RentalController.deleteRental);


router.get('/api/check-auth', auth, (req, res) => {
    res.json({
    authenticated: true,
    user: req.user
    });
});

router.get('/manutencao', auth, (req,res) => {
    res.render('content/manu');
});

router.get('/mapa', auth, (req,res) => {
    res.render('content/mapa');
});


router.get('/perfil', auth, AuthController.renderPerfil);


router.post('/perfil/upload-foto', auth, upload.single('foto'), AuthController.uploadFoto);

router.get('/perfiladm', admin, AdminController.renderPerfil);


router.post('/perfiladm/upload-foto', admin, upload.single('foto'), AdminController.uploadFoto);

router.post('/api/payments/:orderId', ShopController.generatePaymentLink);

router.get('/check-payment-status/:paymentId', async (req, res) => {
    const { payment_id } = req.query;
  
    try {
        
        const payment = await prisma.payment.findUnique({
            where: { id: payment_id },
        });
  
        if (!payment) {
            return res.status(404).json({ error: "Pagamento não encontrado" });
        }
  
        res.json({ status: payment.status });  

    } catch (error) {
        console.error("Erro ao verificar status do pagamento:", error);
        res.status(500).json({ error: "Erro ao verificar status" });
    }
  });



router.get('/escolheraluguel/:lockerId/:salaId/:numeroArmario', auth, (req, res) => {
    const { lockerId, salaId, numeroArmario } = req.params;
    const userId = req.user.id;  

    
    res.render('content/escolheraluguel', {
        lockerId,
        salaId,
        numeroArmario,
        userId  
    });
});

router.post('/update-status', async (req, res) => {
    const { lockerId, userId, status } = req.body;

    try {
        
        await prisma.lockerId.update({
            where: { id: lockerId },
            data: {
                status: status, 
                usuarioId: userId 
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao atualizar o status do armário:", error);
        res.status(500).json({ success: false, message: "Erro ao atualizar status" });
    }



});

router.post('/webhook', async (req, res) => {
    try {
        // Verifica se é uma notificação do Mercado Pago
        if (!req.headers['x-signature']) {
            console.error('❌ Notificação inválida: cabeçalho x-signature não encontrado');
            return res.status(400).send('Notificação inválida');
        }

        const notification = req.body;
        console.log('🔔 Notificação recebida:', {
            type: notification.type,
            action: notification.action,
            topic: notification.topic,
            resource: notification.resource
        });

        // Verifica se é um pagamento de aluguel pelo external_reference
        if (notification.topic === 'merchant_order') {
            const orderId = notification.resource.split('/').pop();
            const orderResponse = await fetch(`https://api.mercadolibre.com/merchant_orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.KEYMP}`
                }
            });

            if (!orderResponse.ok) {
                console.error('❌ Erro ao buscar detalhes do pedido:', orderResponse.statusText);
                return res.status(500).send('Erro ao buscar detalhes do pedido');
            }

            const order = await orderResponse.json();
            console.log('📦 Detalhes do pedido:', order);

            // Verifica se é um aluguel pelo external_reference
            if (order.external_reference && order.external_reference.startsWith('rental-')) {
                console.log('🏠 Processando pagamento de aluguel');
                await RentalController.handlePaymentNotification(req, res);
                return;
            }
        } else if (notification.type === 'payment') {
            // Se for uma notificação de payment, verifica o external_reference
            const paymentId = notification.data.id;
            const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.KEYMP}`,
                },
            });

            if (!paymentResponse.ok) {
                console.error('❌ Erro ao buscar o pagamento:', paymentResponse.statusText);
                return res.status(500).send('Erro ao buscar o pagamento');
            }

            const payment = await paymentResponse.json();
            
            if (payment.external_reference && payment.external_reference.startsWith('rental-')) {
                console.log('🏠 Processando pagamento de aluguel');
                await RentalController.handlePaymentNotification(req, res);
                return;
            }
        }

        // Se não for um aluguel, processa como produto
        console.log('🛍️ Processando pagamento de produto');
        await ProductController.handlePaymentNotification(req, res);
    } catch (error) {
        console.error('❌ Erro ao processar a notificação:', error);
        return res.status(500).send('Erro ao processar a notificação');
    }
});




router.get("/achadoadm", admin, AchadoController.getAllAchadosForAdmin);


router.get("/achado", auth, (req, res) => {
    AchadoController.getAllAchadosForShop(req, res, (achados) => {
        res.render("achados/achado", { error: null, achados });
    });
});

router.get('/buscarUsuarioPorArmario/:lockerId', async (req, res) => {
    try {
        const lockerId = parseInt(req.params.lockerId);
        const locker = await prisma.locker.findUnique({
            where: { id: lockerId },
            include: { user: true }
        });

        if (locker && locker.user) {
            res.render('admin/perfillocker', {
                nome: locker.user.Nome,
                rm: locker.user.rm,
                email: locker.user.email,
                curso: locker.user.curso,
                tipoEnsino: locker.user.tipoEnsino,
                anoCurso: locker.user.anoCurso,
                armarioNumero: locker.numero 
            });
        } else {
            res.status(404).render('erro', { 
                message: 'Armário ou usuário não encontrado.',
                error: { status: 404 }
            });
        }
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        res.status(500).render('erro', { 
            message: 'Erro interno do servidor.',
            error: { status: 500 }
        });
    }
});


router.get("/detalhesachados/:id", auth, (req, res) => {
    AchadoController.getAchadoforDetails(req, res, (achado) => {
        res.render('achados/Detalhesachado', { achado });
    });
});


router.get('/deleteachado/:id', AchadoController.deleteAchado);


router.get('/updateachado/:id', AchadoController.getUpdateAchadoPage);


router.post('/updateachado/:id', upload.single("image"), AchadoController.updateAchado);


router.post("/achadoadd", upload.single("image"), AchadoController.createAchado);








// Rotas de Pedidos
router.get("/pedidos", auth, PedidoController.getMeusPedidos);
router.get("/pedido/:id", admin , PedidoController.getDetalhesPedido);
router.get("/admin/pedidos", admin, PedidoController.getAllPedidos);
router.post("/admin/pedido/:id/status", admin, PedidoController.atualizarStatusPedido);
router.post("/pedido/:id/cancelar", auth, PedidoController.cancelarPedido);
router.post('/admin/pedido/:id/aceitar', admin, PedidoController.aceitarPedido);

router.get('/dashboard/financeiro', admin, DashboardController.getDashboardFinanceiro);
router.get('/dashboard/lockers', admin, DashboardController.getDashboardLockers);








module.exports = router;