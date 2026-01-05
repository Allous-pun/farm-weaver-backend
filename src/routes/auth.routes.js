// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');

// POST /auth/register
router.post('/register', register);

// POST /auth/login
router.post('/login', login);

module.exports = router;