// src/routes/index.js
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const farmRoutes = require('./farm.routes');
const animalTypeRoutes = require('../modules/animalTypes/animalType.routes');
const animalsModule = require('../modules/animals');

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/farms', farmRoutes);
router.use('/animal-types', animalTypeRoutes);
router.use('/animals', animalsModule);

module.exports = router;