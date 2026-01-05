// src/utils/password.js
const bcrypt = require('bcryptjs');

const passwordUtils = {
  // Hash password
  hashPassword: async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  },

  // Compare password with hash
  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  }
};

module.exports = passwordUtils;