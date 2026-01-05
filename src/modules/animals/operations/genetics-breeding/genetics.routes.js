const express = require('express');
const router = express.Router();
const geneticsController = require('./genetics.controller');

// All genetics routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// Animal-specific genetics routes
router.get('/animal/:animalId', geneticsController.getGeneticProfile); // GET /genetics/animal/:animalId
router.get('/animal/:animalId/pedigree', geneticsController.getPedigreeTree); // GET /genetics/animal/:animalId/pedigree
router.get('/compatibility/:animalId1/:animalId2', geneticsController.getBreedingCompatibility); // GET /genetics/compatibility/:animalId1/:animalId2

// Farm-wide genetics routes
router.get('/farm/:farmId/top-breeders', geneticsController.getTopBreeders); // GET /genetics/farm/:farmId/top-breeders
router.get('/farm/:farmId/pair-suggestions', geneticsController.getBreedingPairSuggestions); // GET /genetics/farm/:farmId/pair-suggestions
router.get('/farm/:farmId/dashboard', geneticsController.getGeneticsDashboard); // GET /genetics/farm/:farmId/dashboard
router.post('/farm/:farmId/batch-compute', geneticsController.batchComputeGeneticProfiles); // POST /genetics/farm/:farmId/batch-compute

// Inbreeding risk check
router.get('/inbreeding-risk/:animalId1/:animalId2', geneticsController.checkInbreedingRisk); // GET /genetics/inbreeding-risk/:animalId1/:animalId2

// Animal type genetics settings (requires AnimalType model update)
router.patch('/animal-type/:animalTypeId/settings', geneticsController.updateAnimalTypeGeneticsSettings); // PATCH /genetics/animal-type/:animalTypeId/settings

module.exports = router;