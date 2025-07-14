function isValidNotification(notification) {
    
    const isValid = (
      notification &&
      notification.type === 'payment' && 
      notification.action === 'payment.created' && 
      notification.data && 
      notification.data.id 
    );
  
    
    console.log('Resultado da validação da notificação:', isValid);
    return isValid;
  }