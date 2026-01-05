const express = require('express');
const router = express.Router();
const productionController = require('./production.controller');

// All production routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// Production recording routes
router.post('/', productionController.recordProduction); // POST /production
router.get('/farm/:farmId', productionController.getProductionByFarm); // GET /production/farm/:farmId
router.get('/animal/:animalId', productionController.getProductionByAnimal); // GET /production/animal/:animalId
router.get('/:productionId', productionController.getProductionById); // GET /production/:productionId
router.put('/:productionId', productionController.updateProduction); // PUT /production/:productionId
router.delete('/:productionId', productionController.deleteProduction); // DELETE /production/:productionId

// Statistics and analysis routes
router.get('/animal/:animalId/statistics', productionController.getAnimalProductionStatistics); // GET /production/animal/:animalId/statistics
router.get('/farm/:farmId/statistics', productionController.getFarmProductionStatistics); // GET /production/farm/:farmId/statistics
router.get('/farm/:farmId/trends', productionController.getProductionTrends); // GET /production/farm/:farmId/trends
router.get('/farm/:farmId/alerts', productionController.getProductionAlerts); // GET /production/farm/:farmId/alerts
router.get('/farm/:farmId/dashboard', productionController.getProductionDashboard); // GET /production/farm/:farmId/dashboard

// Utility routes
router.get('/animal-type/:animalTypeId/production-types', productionController.getProductionTypes); // GET /production/animal-type/:animalTypeId/production-types
router.get('/quality-metrics/:productionType', productionController.getQualityMetrics); // GET /production/quality-metrics/:productionType

module.exports = router;