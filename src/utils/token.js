// src/utils/token.js
const jwt = require('jsonwebtoken');

const tokenUtils = {
  // Create JWT token
  generateToken: (userId) => {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: '7d' }
    );
  },

  // Verify JWT token
  verifyToken: (token) => {
    try {
      return jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
      );
    } catch (error) {
      return null;
    }
  }
};

module.exports = tokenUtils;