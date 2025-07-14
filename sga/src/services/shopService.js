const prisma = require('../config/database');

class ShopService {
  // Criar um novo pedido e adicionar itens ao pedido
  async createOrderAndAddItems(userId, items) {
    try {
      if (!userId || !items || items.length === 0) {
        throw new Error('userId e itens são obrigatórios.');
      }

      // 1. Criar o pedido
      const order = await prisma.order.create({
        data: {
          userId,
          status: 'pending',
          totalPrice: 0
        }
      });

      // 2. Adicionar itens ao pedido
      for (const item of items) {
        const { productId, quantity } = item;

        if (!productId || !quantity) {
          throw new Error('productId e quantity são obrigatórios.');
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
          throw new Error(`Produto com ID ${productId} não encontrado.`);
        }

        const existingItem = await prisma.orderItem.findFirst({
          where: { orderId: order.id, productId }
        });

        if (existingItem) {
          // Atualiza a quantidade se o item já existir no pedido
          await prisma.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + quantity }
          });
        } else {
          // Adiciona um novo item ao pedido com o preço do produto
          await prisma.orderItem.create({
            data: { 
              orderId: order.id, 
              productId, 
              quantity,
              productPrice: product.price || 0  // Certifique-se de que o preço está sendo passado
            }
          });
        }
      }

      // 3. Atualiza o total do pedido
      await this.calculateOrderTotal(order.id);

      // 4. Retorna o pedido com os detalhes
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { orderItems: { include: { product: true } } }
      });

      return fullOrder;
    } catch (error) {
      throw new Error('Erro ao criar pedido e adicionar itens: ' + error.message);
    }
  }

  // Calcular o total do pedido
  async calculateOrderTotal(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { product: true } } }
      });

      if (!order) throw new Error('Pedido não encontrado.');

      const totalPrice = order.orderItems.reduce((total, item) => {
        return total + item.quantity * item.productPrice; // Usando productPrice em vez de product.price
      }, 0);

      await prisma.order.update({
        where: { id: orderId },
        data: { totalPrice }
      });

      return totalPrice;
    } catch (error) {
      throw new Error('Erro ao calcular valor total do pedido: ' + error.message);
    }
  }

  // Obter detalhes de um pedido
  async getOrderDetails(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { product: true } } }
      });
      if (!order) throw new Error('Pedido não encontrado.');
      return order;
    } catch (error) {
      throw new Error('Erro ao obter detalhes do pedido: ' + error.message);
    }
  }

  // Listar todos os pedidos de um usuário
  async listOrdersByUser(userId) {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { orderItems: { include: { product: true } } }
      });
      return orders;
    } catch (error) {
      throw new Error('Erro ao listar pedidos: ' + error.message);
    }
  }

  // Atualizar status do pedido
  async updateOrderStatus(orderId, status) {
    try {
      const validStatuses = ['pending', 'processing', 'completed', 'canceled'];
      if (!validStatuses.includes(status)) throw new Error('Status inválido.');

      return await prisma.order.update({
        where: { id: orderId },
        data: { status }
      });
    } catch (error) {
      throw new Error('Erro ao atualizar status do pedido: ' + error.message);
    }
  }

  // Cancelar pedido
  async cancelOrder(orderId) {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) throw new Error('Pedido não encontrado.');
      if (order.status === 'completed') throw new Error('Não é possível cancelar um pedido já concluído.');

      return await prisma.order.update({
        where: { id: orderId },
        data: { status: 'canceled' }
      });
    } catch (error) {
      throw new Error('Erro ao cancelar pedido: ' + error.message);
    }
  }

  // Obter produtos para pagamento
  async getProductsForPayment(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: { include: { product: true } } }
      });

      if (!order || !order.orderItems.length) throw new Error('Pedido não encontrado ou vazio.');

      return order.orderItems.map(item => ({
        id: item.product.id.toString(),
        title: item.product.title,
        quantity: item.quantity,
        unit_price: parseFloat(item.productPrice), // Usando productPrice ao invés de product.price
        currency_id: 'BRL'
      }));
    } catch (error) {
      throw new Error('Erro ao buscar produtos do pedido: ' + error.message);
    }
  }
}

module.exports = new ShopService();
