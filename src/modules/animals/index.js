// src/modules/animals/index.js
const express = require('express');
const router = express.Router();

// Import animal records routes
const animalRecordsRoutes = require('./animalRecords/animal.routes');
const feedRoutes = require('./operations/feeds/feed.routes');
const healthRoutes = require('./operations/health-vaccination/health.routes');
const reproductionRoutes = require('./operations/reproductions/reproduction.routes');
const geneticsRoutes = require('./operations/genetics-breeding/genetics.routes');
const inventoryRoutes = require('./operations/inventory/inventory.routes');
const productionRoutes = require('./operations/production/production.routes');

// Mount animal routes
router.use('/records', animalRecordsRoutes);
router.use('/feeds', feedRoutes); 
router.use('/health', healthRoutes);
router.use('/reproduction', reproductionRoutes);
router.use('/genetics', geneticsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/production', productionRoutes);

module.exports = router;