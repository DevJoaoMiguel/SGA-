
const jwt = require('jsonwebtoken');

const authResponse = (req, res, next) => {
    
    if (req.user) {
        
        const token = jwt.sign(
            { id: req.user.id, role: req.user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '10h' } 
        );
        
        
        res.locals.token = token;
        res.locals.userId = req.user.id;
    } 
    
    else if (req.admin) {
        
        const token = jwt.sign(
            { id: req.admin.id, role: 'admin' }, 
            process.env.JWT_SECRET, 
            { expiresIn: '10h' } 
        );
        
        
        res.locals.token = token;
        res.locals.userId = req.admin.id;
    }

    
    next();
};

module.exports = authResponse;
