const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    console.warn('authenticateToken: No Authorization header / token provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  if (!process.env.JWT_SECRET) {
    console.warn('authenticateToken: JWT_SECRET is not set in environment');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('authenticateToken: token verification failed:', err && err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }

    console.log('authenticateToken: token verified, payload:', user);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;