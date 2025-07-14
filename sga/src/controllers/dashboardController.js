const prisma = require('../config/database');

class DashboardController {
    async showDashboard(req, res) {
        try {
            // Receita total de pagamentos
            const receitaTotal = await prisma.pagamento.aggregate({
                _sum: {
                    precoTotal: true
                }
            });

            // Quantidade total de itens em estoque
            const totalEstoque = await prisma.stock.aggregate({
                _sum: {
                    quantidade: true
                }
            });

            // Total de pedidos
            const totalPedidos = await prisma.pedido.count();

            // Total de aluguéis ativos
            const alugueisAtivos = await prisma.rental.count({
                where: {
                    status: 'ativo'
                }
            });

            res.render('dashboard', {
                receitaTotal: receitaTotal._sum.precoTotal || 0,
                totalEstoque: totalEstoque._sum.quantidade || 0,
                totalPedidos,
                alugueisAtivos
            });
        } catch (error) {
            console.error('Erro ao carregar o dashboard:', error);
            res.status(500).send('Erro ao carregar o dashboard');
        }
    }

    async getDashboardFinanceiro(req, res) {
        try {
            const period = req.query.period || 'month';

            // Buscar todos os pedidos com seus produtos
            const pedidos = await prisma.pedido.findMany({
                include: {
                    produto: true
                },
                orderBy: {
                    criadoEm: 'desc'
                }
            });

            // Filtrar pedidos por período
            const now = new Date();
            let startDate;

            switch (period) {
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate = new Date(now);
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 1);
            }

            const pedidosFiltrados = pedidos.filter(pedido => {
                const dataPedido = new Date(pedido.criadoEm);
                return dataPedido >= startDate && dataPedido <= now;
            });

            // Calcular totais
            const totalVendas = pedidosFiltrados.reduce((acc, pedido) => acc + (pedido.totalPrice || 0), 0);
            const pedidosPendentes = pedidosFiltrados.filter(p => p.status === 'pendente').length;
            const pedidosEntregues = pedidosFiltrados.filter(p => p.status === 'approved').length;

            // Agrupar vendas por período
            const faturamentoPorMes = [];
            let periodLabels;
            let periodData;

            switch (period) {
                case 'week':
                    periodLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
                    periodData = Array(7).fill(0);
                    break;
                case 'month':
                    periodLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    periodData = Array(12).fill(0);
                    break;
                case 'year':
                    periodLabels = ['2023', '2024'];
                    periodData = Array(2).fill(0);
                    break;
            }

            pedidosFiltrados.forEach(pedido => {
                const dataPedido = new Date(pedido.criadoEm);
                let index;

                switch (period) {
                    case 'week':
                        index = dataPedido.getDay();
                        break;
                    case 'month':
                        index = dataPedido.getMonth();
                        break;
                    case 'year':
                        index = dataPedido.getFullYear() - 2023;
                        break;
                }

                if (index >= 0 && index < periodData.length) {
                    periodData[index] += pedido.totalPrice || 0;
                }
            });

            faturamentoPorMes.push(...periodLabels.map((label, i) => ({
                mes: label,
                valor: periodData[i]
            })));

            // Agrupar vendas por produto
            const vendasPorProduto = {};
            pedidosFiltrados.forEach(pedido => {
                if (!pedido.produto) return;
                
                const produtoId = pedido.produtoId;
                if (!vendasPorProduto[produtoId]) {
                    vendasPorProduto[produtoId] = {
                        nome: pedido.produto.title,
                        quantidade: 0,
                        valor: 0
                    };
                }
                vendasPorProduto[produtoId].quantidade += pedido.quantidade || 0;
                vendasPorProduto[produtoId].valor += pedido.totalPrice || 0;
            });

            // Ordenar produtos por quantidade vendida
            const produtosMaisVendidos = Object.values(vendasPorProduto)
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 5);

            // Buscar produtos com estoque baixo
            const produtosBaixoEstoque = await prisma.product.findMany({
                where: {
                    stocks: {
                        some: {
                            quantidade: {
                                lte: 10
                            }
                        }
                    }
                },
                include: {
                    stocks: true
                }
            });

            // Formatar dados para o dashboard
            const produtosBaixoEstoqueFormatado = produtosBaixoEstoque.map(produto => ({
                name: produto.title,
                quantity: produto.stocks.reduce((acc, stock) => acc + (stock.quantidade || 0), 0)
            }));

            // Últimas vendas
            const ultimasVendas = pedidosFiltrados
                .slice(0, 5)
                .map(pedido => ({
                    produto: pedido.produto,
                    totalPrice: pedido.totalPrice,
                    criadoEm: pedido.criadoEm
                }));

            const dados = {
                totalVendas: totalVendas.toFixed(2),
                pedidosPendentes,
                pedidosEntregues,
                produtosBaixoEstoque: produtosBaixoEstoqueFormatado,
                ultimasVendas,
                faturamentoPorMes,
                produtosMaisVendidos
            };

            if (req.xhr || req.headers.accept.includes('application/json')) {
                res.json(dados);
            } else {
                res.render("admin/dashboard-financeiro", dados);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            if (req.xhr || req.headers.accept.includes('application/json')) {
                res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
            } else {
                res.render("admin/dashboard-financeiro", {
                    totalVendas: '0,00',
                    pedidosPendentes: 0,
                    pedidosEntregues: 0,
                    produtosBaixoEstoque: [],
                    ultimasVendas: [],
                    faturamentoPorMes: [],
                    produtosMaisVendidos: []
                });
            }
        }
    }

    async getDashboardLockers(req, res) {
        try {
            const period = req.query.period || 'month';

            // Buscar todos os armários e aluguéis
            const [armarios, alugueisAtivos, alugueis] = await Promise.all([
                prisma.locker.findMany({
                    include: {
                        sala: {
                            include: {
                                corredor: true
                            }
                        }
                    }
                }),
                prisma.rental.findMany({
                    where: {
                        status: 'ativo',
                        endDate: {
                            gte: new Date()
                        }
                    },
                    include: {
                        locker: true
                    }
                }),
                prisma.rental.findMany({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                        }
                    },
                    include: {
                        locker: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })
            ]);

            // Calcular totais
            const receitaTotal = alugueis.reduce((acc, aluguel) => acc + (aluguel.price || 0), 0);
            const totalArmarios = armarios.length;
            const armariosOcupados = alugueisAtivos.length;
            const armariosDisponiveis = totalArmarios - armariosOcupados;

            // Agrupar receita por período
            const receitaPorPeriodo = [];
            let periodLabels;
            let periodData;

            switch (period) {
                case 'week':
                    periodLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
                    periodData = Array(7).fill(0);
                    break;
                case 'month':
                    periodLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    periodData = Array(12).fill(0);
                    break;
                case 'year':
                    periodLabels = ['2023', '2024'];
                    periodData = Array(2).fill(0);
                    break;
            }

            alugueis.forEach(aluguel => {
                const dataAluguel = new Date(aluguel.createdAt);
                let index;

                switch (period) {
                    case 'week':
                        index = dataAluguel.getDay();
                        break;
                    case 'month':
                        index = dataAluguel.getMonth();
                        break;
                    case 'year':
                        index = dataAluguel.getFullYear() - 2023;
                        break;
                }

                if (index >= 0 && index < periodData.length) {
                    periodData[index] += aluguel.price || 0;
                }
            });

            receitaPorPeriodo.push(...periodLabels.map((label, i) => ({
                periodo: label,
                valor: periodData[i]
            })));

            // Últimos aluguéis
            const ultimosAlugueis = alugueisAtivos
                .slice(0, 5)
                .map(aluguel => ({
                    locker: {
                        ...aluguel.locker,
                        number: aluguel.locker.numero
                    },
                    status: aluguel.status,
                    price: aluguel.price,
                    createdAt: aluguel.createdAt
                }));

            // Próximos vencimentos
            const proximosVencimentos = alugueisAtivos
                .map(aluguel => {
                    const endDate = new Date(aluguel.endDate);
                    const today = new Date();
                    const diasRestantes = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                    
                    return {
                        locker: {
                            ...aluguel.locker,
                            number: aluguel.locker.numero
                        },
                        endDate: aluguel.endDate,
                        price: aluguel.price,
                        diasRestantes
                    };
                })
                .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
                .slice(0, 5);

            const dados = {
                receitaTotal: receitaTotal.toFixed(2),
                totalArmarios,
                armariosOcupados,
                armariosDisponiveis,
                receitaPorPeriodo,
                ultimosAlugueis,
                proximosVencimentos
            };

            if (req.xhr || req.headers.accept.includes('application/json')) {
                res.json(dados);
            } else {
                res.render("admin/dashboard-lockers", dados);
            }
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            if (req.xhr || req.headers.accept.includes('application/json')) {
                res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
            } else {
                res.render("admin/dashboard-lockers", {
                    receitaTotal: '0,00',
                    totalArmarios: 0,
                    armariosOcupados: 0,
                    armariosDisponiveis: 0,
                    receitaPorPeriodo: [],
                    ultimosAlugueis: [],
                    proximosVencimentos: []
                });
            }
        }
    }
}

module.exports = new DashboardController();
