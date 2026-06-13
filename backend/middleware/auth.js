const jwt = require('jsonwebtoken');
const JWT_SECRET = '3108aaa4149998a0de6c764510cd7ec1c9fc60827545d68530ff4fe86bb37ad1'; // Keep this matching the secret in server.js

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ error: 'A token is required for authentication' });
    }

    // Expecting format: Bearer <token>
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ error: 'Invalid token format' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
    } catch (err) {
        return res.status(401).json({ error: 'Invalid Token' });
    }
    
    return next();
};

module.exports = verifyToken;
