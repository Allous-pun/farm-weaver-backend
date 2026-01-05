// src/modules/animalTypes/animalType.routes.js
const express = require('express');
const router = express.Router();
const {
  createAnimalType,
  getAnimalTypes,
  getAnimalType,
  updateAnimalType,
  archiveAnimalType,
  restoreAnimalType,
  deleteAnimalType,
} = require('./animalType.controller');

// All animal type routes require authentication
const authMiddleware = require('../../middlewares/auth.middleware');
router.use(authMiddleware);

// Animal type routes
router.post('/', createAnimalType); // POST /animal-types
router.get('/', getAnimalTypes); // GET /animal-types (optionally ?farmId=xxx&includeArchived=true)
router.get('/:animalTypeId', getAnimalType); // GET /animal-types/:animalTypeId
router.put('/:animalTypeId', updateAnimalType); // PUT /animal-types/:animalTypeId
router.delete('/:animalTypeId', archiveAnimalType); // DELETE /animal-types/:animalTypeId (soft delete)
router.delete('/:animalTypeId/permanent', deleteAnimalType); // DELETE /animal-types/:animalTypeId/permanent (hard delete)
router.patch('/:animalTypeId/restore', restoreAnimalType); // PATCH /animal-types/:animalTypeId/restore

module.exports = router;