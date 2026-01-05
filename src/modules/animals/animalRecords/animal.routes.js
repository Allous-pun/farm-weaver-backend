// src/modules/animals/animalRecords/animal.routes.js
const express = require('express');
const router = express.Router();
const {
  createAnimal,
  getAnimal,
  getAnimalsByFarm,
  getUserAnimals,
  updateAnimal,
  updateAnimalStatus,
  updateAnimalWeight,
  archiveAnimal,
  getAnimalStatistics,
} = require('./animal.controller');

// All animal routes require authentication
const authMiddleware = require('../../../middlewares/auth.middleware');
router.use(authMiddleware);

// Animal routes - Note: these are now relative to /animals/records
router.post('/', createAnimal); // POST /animals/records
router.get('/', getUserAnimals); // GET /animals/records
router.get('/:animalId', getAnimal); // GET /animals/records/:animalId

// Farm-specific animal routes
router.get('/farm/:farmId', getAnimalsByFarm); // GET /animals/records/farm/:farmId
router.get('/farm/:farmId/statistics', getAnimalStatistics); // GET /animals/records/farm/:farmId/statistics

// Animal update routes
router.put('/:animalId', updateAnimal); // PUT /animals/records/:animalId
router.patch('/:animalId/status', updateAnimalStatus); // PATCH /animals/records/:animalId/status
router.patch('/:animalId/weight', updateAnimalWeight); // PATCH /animals/records/:animalId/weight
router.delete('/:animalId', archiveAnimal); // DELETE /animals/records/:animalId

module.exports = router;