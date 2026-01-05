// src/service/auth.service.js
const User = require('../modules/users/user.model');
const passwordUtils = require('../utils/password');
const tokenUtils = require('../utils/token');

const authService = {
  // Register new user
  register: async (userData) => {
    const { name, email, password } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await passwordUtils.hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    // Generate token
    const token = tokenUtils.generateToken(user._id);

    return {
      user: user.toJSON(),
      token,
    };
  },

  // Login user
  login: async (email, password) => {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await passwordUtils.comparePassword(
      password,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = tokenUtils.generateToken(user._id);

    return {
      user: user.toJSON(),
      token,
    };
  },

  // Get user by ID (for auth middleware)
  getUserById: async (userId) => {
    return await User.findById(userId);
  }
};

module.exports = authService;