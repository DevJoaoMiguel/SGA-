const ShopService = require('../services/shopService');
const ProductService = require('../services/productService');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.KEYMP 
});
const preference = new Preference(client);

class ShopController {
  
    async createOrderAndAddItem(req, res) {
      try {
        const { userId, items } = req.body; 
    
        if (!userId || !items || items.length === 0) {
          return res.status(400).json({ error: 'userId e itens são obrigatórios.' });
        }
    
        
        const order = await ShopService.createOrder(userId);
    
        
        for (const item of items) {
          const { productId, quantity } = item;
          if (!productId || !quantity) {
            return res.status(400).json({ error: 'productId e quantity são obrigatórios.' });
          }
          await ShopService.addItemToOrder(order.id, productId, quantity);
        }
         
        
        res.status(201).json({ orderId: order.id, items: items });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  
    
  
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ error: 'orderId é obrigatório.' });
      }

      const orderDetails = await ShopService.getOrderDetails(orderId);
      res.status(200).json(orderDetails);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  
  async updateOrderItem(req, res) {
    try {
      const { orderId, productId, quantity } = req.body;

      if (!orderId || !productId || !quantity) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }

      const updatedItem = await ShopService.updateOrderItem(orderId, productId, quantity);
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  
  async removeOrderItem(req, res) {
    try {
      const { orderId, productId } = req.body;

      if (!orderId || !productId) {
        return res.status(400).json({ error: 'orderId e productId são obrigatórios.' });
      }

      await ShopService.removeOrderItem(orderId, productId);
      res.status(200).json({ message: 'Item removido do pedido com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  
  async generatePaymentLink(req, res) {
    try {
      const { orderId } = req.body;
  
      if (!orderId) {
        return res.status(400).json({ error: 'orderId é obrigatório.' });
      }
  
      const items = await ShopService.getProductsForPayment(orderId);
  
      const body = {
        items,
        back_urls: {
          success:'https://27bc-2804-7f0-b380-66c5-ddd6-b2a7-84b3-21a5.ngrok-free.app',
          failure:'https://27bc-2804-7f0-b380-66c5-ddd6-b2a7-84b3-21a5.ngrok-free.app',
          pending:'https://27bc-2804-7f0-b380-66c5-ddd6-b2a7-84b3-21a5.ngrok-free.app',
        },
        auto_return: 'approved',
        external_reference: orderId.toString(),
        notification_url: `${process.env.BASE_URL}/webhook`
      };
  
      const response = await preference.create({ body });
  
      if (!response || !response.init_point) {
        return res.status(500).json({ error: 'Erro ao gerar link de pagamento.' });
      }
  
      res.json({ paymentLink: response.init_point });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ShopController();
