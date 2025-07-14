const prisma = require("../config/database");
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

class PedidoController {
    // Buscar todos os pedidos do usuário
    async getMeusPedidos(req, res) {
        try {
            console.log('User ID:', req.user.id); // Log para debug
            
            const pedidos = await prisma.pedido.findMany({
                where: {
                    userId: parseInt(req.user.id) // Garantir que o ID é um número
                },
                include: {
                    produto: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            image: true
                        }
                    }
                },
                orderBy: {
                    criadoEm: 'desc'
                }
            });

            console.log('Pedidos encontrados:', pedidos.length); // Log para debug

            // Formatar os dados antes de enviar para a view
            const pedidosFormatados = pedidos.map(pedido => ({
                id: pedido.id,
                criadoEm: pedido.criadoEm,
                totalPrice: Number(pedido.totalPrice),
                status: pedido.status || 'pendente',
                tamanho: pedido.tamanho,
                quantidade: pedido.quantidade,
                produto: pedido.produto
            }));

            res.render("user/pedidos", { 
                pedidos: pedidosFormatados, 
                error: null,
                formatPrice: (price) => price ? price.toFixed(2) : '0.00'
            });
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
            res.render("user/pedidos", { 
                pedidos: [], 
                error: "Erro ao carregar pedidos.",
                formatPrice: (price) => '0.00'
            });
        }
    }




    // Buscar detalhes de um pedido específico
    async getDetalhesPedido(req, res) {
        try {
            const pedido = await prisma.pedido.findUnique({
                where: {
                    id: Number(req.params.id)
                },
                select: {
                    id: true,
                    criadoEm: true,
                    totalPrice: true,
                    status: true,
                    tamanho: true,
                    quantidade: true,
                    userId: true,
                    produto: {
                        select: {
                            title: true,
                            price: true,
                            image: true
                        }
                    },
                    user: {
                        select: {
                            Nome: true,
                            email: true,
                            rm: true
                        }
                    }
                }
            });

            if (!pedido) {
                return res.status(404).render("error", { message: "Pedido não encontrado" });
            }

            // Verificar se o pedido pertence ao usuário logado ou se é admin
            if (pedido.userId !== req.userId && !req.admin) {
                return res.status(403).render("error", { message: "Acesso não autorizado" });
            }

            // Formatar o pedido
            const pedidoFormatado = {
                ...pedido,
                totalPrice: Number(pedido.totalPrice),
                createdAt: pedido.criadoEm ? new Date(pedido.criadoEm) : new Date()
            };

            res.render("admin/detalhes-pedido", { 
                pedido: pedidoFormatado, 
                error: null,
                formatPrice: (price) => price ? price.toFixed(2) : '0.00'
            });
        } catch (error) {
            console.error("Erro ao buscar detalhes do pedido:", error);
            res.render("admin/detalhes-pedido", { 
                pedido: null, 
                error: "Erro ao carregar detalhes do pedido.",
                formatPrice: (price) => '0.00'
            });
        }
    }

    // Listar todos os pedidos (admin)
    async getAllPedidos(req, res) {
        try {
            const pedidos = await prisma.pedido.findMany({
                select: {
                    id: true,
                    criadoEm: true,
                    totalPrice: true,
                    status: true,
                    tamanho: true,
                    quantidade: true,
                    produto: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            image: true
                        }
                    },
                    user: {
                        select: {
                            Nome: true,
                            Sobrenome: true,
                            email: true,
                            rm: true
                        }
                    }
                },
                orderBy: {
                    id: 'desc'
                }
            });

            // Formatar os pedidos
            const pedidosFormatados = pedidos.map(pedido => ({
                ...pedido,
                totalPrice: Number(pedido.totalPrice || 0),
                createdAt: pedido.criadoEm ? new Date(pedido.criadoEm) : new Date(),
                status: pedido.status || 'pendente'
            }));

            // Calcular estatísticas
            const stats = {
                totalPedidos: pedidos.length,
                pedidosAprovados: pedidos.filter(p => p.status === 'approved').length,
                pedidosPendentes: pedidos.filter(p => p.status === 'pendente').length,
                receitaTotal: pedidos
                    .filter(p => p.status === 'approved')
                    .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0),
                mediaPedidos: pedidos.length > 0 
                    ? pedidos.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0) / pedidos.length 
                    : 0,
                receitaMensal: pedidos
                    .filter(p => {
                        const pedidoDate = new Date(p.criadoEm);
                        const hoje = new Date();
                        return p.status === 'approved' &&
                            pedidoDate.getMonth() === hoje.getMonth() &&
                            pedidoDate.getFullYear() === hoje.getFullYear();
                    })
                    .reduce((sum, p) => sum + Number(p.totalPrice || 0), 0)
            };

            res.render("admin/pedidosadmin", { 
                pedidos: pedidosFormatados, 
                stats,
                error: null,
                formatPrice: (price) => Number(price || 0).toFixed(2),
                formatDate: (date) => date ? new Date(date).toLocaleDateString() : '-'
            });
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
            const emptyStats = {
                totalPedidos: 0,
                pedidosAprovados: 0,
                pedidosPendentes: 0,
                receitaTotal: 0,
                mediaPedidos: 0,
                receitaMensal: 0
            };

            res.render("admin/pedidosadmin", { 
                pedidos: [], 
                stats: emptyStats,
                error: "Erro ao carregar pedidos.",
                formatPrice: (price) => (0).toFixed(2),
                formatDate: (date) => '-'
            });
        }
    }

    // Atualizar status do pedido
    async updatePedidoStatus(req, res) {
        try {
            const { status } = req.body;
            const pedidoId = Number(req.params.id);

            const pedido = await prisma.pedido.update({
                where: {
                    id: pedidoId
                },
                data: {
                    status: status
                }
            });

            // Buscar informações do usuário
            const user = await prisma.user.findUnique({
                where: { id: pedido.userId }
            });

            // Enviar email de notificação
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: `Status do seu pedido foi atualizado - ${status}`,
                html: `
                    <h1>Olá, ${user.Nome}!</h1>
                    <p>O status do seu pedido foi atualizado para: ${status}</p>
                    <p>Número do pedido: ${pedido.id}</p>
                    <p>Se tiver alguma dúvida, entre em contato conosco.</p>
                `
            };

            await transporter.sendMail(mailOptions);

            res.redirect("/admin/pedidos");
        } catch (error) {
            console.error("Erro ao atualizar status do pedido:", error);
            res.status(500).json({ error: "Erro ao atualizar status do pedido." });
        }
    }

    // Cancelar pedido
    async cancelarPedido(req, res) {
        try {
            const pedidoId = Number(req.params.id);
            const userId = req.user.id;

            const pedido = await prisma.pedido.findUnique({
                where: { id: pedidoId },
                include: { produto: true }
            });

            if (!pedido) {
                return res.status(404).json({ error: "Pedido não encontrado" });
            }

            // Verificar se o pedido pertence ao usuário
            if (pedido.userId !== userId && !req.isAdmin) {
                return res.status(403).json({ error: "Não autorizado" });
            }

            // Atualizar status do pedido
            await prisma.pedido.update({
                where: { id: pedidoId },
                data: { status: "CANCELADO" }
            });

            // Devolver ao estoque
            await prisma.stock.update({
                where: {
                    productId_tamanho: {
                        productId: pedido.produtoId,
                        tamanho: pedido.tamanho
                    }
                },
                data: {
                    quantidade: {
                        increment: pedido.quantidade
                    }
                }
            });

            res.json({ message: "Pedido cancelado com sucesso" });
        } catch (error) {
            console.error("Erro ao cancelar pedido:", error);
            res.status(500).json({ error: "Erro ao cancelar pedido" });
        }
    }

    async atualizarStatusPedido(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Buscar o pedido atual
            const pedido = await prisma.pedido.findUnique({
                where: { id: Number(id) },
                include: {
                    user: {
                        select: {
                            Nome: true,
                            email: true
                        }
                    },
                    produto: {
                        select: {
                            title: true
                        }
                    }
                }
            });

            if (!pedido) {
                return res.status(404).json({ error: "Pedido não encontrado" });
            }

            // Atualizar o status do pedido
            const pedidoAtualizado = await prisma.pedido.update({
                where: { id: Number(id) },
                data: { status }
            });

            // Enviar email de confirmação
            if (status === 'approved') {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: pedido.user.email,
                    subject: 'Pedido Aprovado - Pronto para Retirada',
                    html: `
                        <h1>Olá, ${pedido.user.Nome}!</h1>
                        <p>Seu pedido #${pedido.produto.title} foi aprovado e está pronto para retirada!</p>
                        <p>Detalhes do pedido:</p>
                        <ul>
                            <li>Produto: ${pedido.produto.title}</li>
                            <li>Tamanho: ${pedido.tamanho}</li>
                            <li>Quantidade: ${pedido.quantidade}</li>
                            <li>Valor Total: R$ ${pedido.totalPrice.toFixed(2)}</li>
                        </ul>
                        <p>Você pode retirar seu produto na secretaria.</p>
                        <p>Obrigado pela sua compra!</p>
                    `
                };

                await transporter.sendMail(mailOptions);
            }

            res.redirect('/admin/pedidos');
        } catch (error) {
            console.error("Erro ao atualizar status do pedido:", error);
            res.status(500).json({ error: "Erro ao atualizar status do pedido" });
        }
    }

    async aceitarPedido(req, res) {
        try {
            const { id } = req.params;
            
            // Buscar o pedido com informações do usuário e produto
            const pedido = await prisma.pedido.findUnique({
                where: { id: Number(id) },
                include: {
                    user: {
                        select: {
                            Nome: true,
                            email: true
                        }
                    },
                    produto: {
                        select: {
                            title: true,
                            price: true
                        }
                    }
                }
            });

            if (!pedido) {
                return res.status(404).json({ error: "Pedido não encontrado" });
            }

            // Atualizar o status do pedido para aprovado
            const pedidoAtualizado = await prisma.pedido.update({
                where: { id: Number(id) },
                data: { status: 'approved' }
            });

            // Enviar email de confirmação
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: pedido.user.email,
                subject: 'Pedido Aprovado - Pronto para Retirada',
                html: `
                    <h1>Olá, ${pedido.user.Nome}!</h1>
                    <p>Seu pedido #${pedido.id} foi aprovado e está pronto para retirada!</p>
                    <p>Detalhes do pedido:</p>
                    <ul>
                        <li>Produto: ${pedido.produto.title}</li>
                        <li>Tamanho: ${pedido.tamanho}</li>
                        <li>Quantidade: ${pedido.quantidade}</li>
                        <li>Valor Total: R$ ${pedido.totalPrice.toFixed(2)}</li>
                    </ul>
                    <p>Você pode retirar seu produto na secretaria.</p>
                    <p>Obrigado pela sua compra!</p>
                `
            };

            await transporter.sendMail(mailOptions);

            // Redirecionar de volta para a página de pedidos
            res.redirect('/admin/pedidos');

        } catch (error) {
            console.error("Erro ao aceitar pedido:", error);
            res.status(500).json({ error: "Erro ao aceitar pedido" });
        }
    }
}

module.exports = new PedidoController(); 