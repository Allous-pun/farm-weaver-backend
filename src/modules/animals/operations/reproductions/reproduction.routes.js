// src/modules/animals/operations/reproductions/reproduction.routes.js
const express = require('express');
const router = express.Router();

// Import all controllers
const {
  // Mating events
  createMatingEvent,
  getAnimalMatingEvents,
  getMatingEvent,
  updateMatingEvent,
  recordMatingOutcome,
  deleteMatingEvent,
  getMatingStatistics,
  
  // Pregnancies
  createPregnancy,
  getAnimalPregnancies,
  getPregnancy,
  updatePregnancy,
  recordPregnancyCheckup,
  markPregnancyTerminated,
  getPregnancyAlerts,
  getPregnancyStatistics,
  
  // Birth events
  createBirthEvent,
  getAnimalBirthEvents,
  getBirthEvent,
  updateBirthEvent,
  markBirthEventCompleted,
  recordNeonatalDeath,
  getBirthStatistics,
  
  // Offspring tracking
  getOffspringTracking,
  updateOffspringTracking,
  recordWeaning,
  recordSale,
  recordOffspringDeath,
  recordGrowthMeasurement,
  getOffspringByDam,
  getOffspringBySire,
  getOffspringStatistics,
  
  // Dashboard
  getReproductionDashboard,
} = require('./reproduction.controller');

// All reproduction routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// ===== MATING EVENTS =====
router.post('/mating', createMatingEvent); // POST /reproduction/mating
router.get('/mating/animal/:animalId', getAnimalMatingEvents); // GET /reproduction/mating/animal/:animalId
router.get('/mating/:eventId', getMatingEvent); // GET /reproduction/mating/:eventId
router.put('/mating/:eventId', updateMatingEvent); // PUT /reproduction/mating/:eventId
router.patch('/mating/:eventId/outcome', recordMatingOutcome); // PATCH /reproduction/mating/:eventId/outcome
router.delete('/mating/:eventId', deleteMatingEvent); // DELETE /reproduction/mating/:eventId
router.get('/mating/statistics/farm/:farmId', getMatingStatistics); // GET /reproduction/mating/statistics/farm/:farmId

// ===== PREGNANCIES =====
router.post('/pregnancy', createPregnancy); // POST /reproduction/pregnancy
router.get('/pregnancy/animal/:animalId', getAnimalPregnancies); // GET /reproduction/pregnancy/animal/:animalId
router.get('/pregnancy/:pregnancyId', getPregnancy); // GET /reproduction/pregnancy/:pregnancyId
router.put('/pregnancy/:pregnancyId', updatePregnancy); // PUT /reproduction/pregnancy/:pregnancyId
router.patch('/pregnancy/:pregnancyId/checkup', recordPregnancyCheckup); // PATCH /reproduction/pregnancy/:pregnancyId/checkup
router.patch('/pregnancy/:pregnancyId/terminate', markPregnancyTerminated); // PATCH /reproduction/pregnancy/:pregnancyId/terminate
router.get('/pregnancy/alerts/farm/:farmId', getPregnancyAlerts); // GET /reproduction/pregnancy/alerts/farm/:farmId
router.get('/pregnancy/statistics/farm/:farmId', getPregnancyStatistics); // GET /reproduction/pregnancy/statistics/farm/:farmId

// ===== BIRTH EVENTS =====
router.post('/birth', createBirthEvent); // POST /reproduction/birth
router.get('/birth/animal/:animalId', getAnimalBirthEvents); // GET /reproduction/birth/animal/:animalId
router.get('/birth/:eventId', getBirthEvent); // GET /reproduction/birth/:eventId
router.put('/birth/:eventId', updateBirthEvent); // PUT /reproduction/birth/:eventId
router.patch('/birth/:eventId/complete', markBirthEventCompleted); // PATCH /reproduction/birth/:eventId/complete
router.patch('/birth/:eventId/neonatal-death', recordNeonatalDeath); // PATCH /reproduction/birth/:eventId/neonatal-death
router.get('/birth/statistics/farm/:farmId', getBirthStatistics); // GET /reproduction/birth/statistics/farm/:farmId

// ===== OFFSPRING TRACKING =====
router.get('/offspring/:offspringId/tracking', getOffspringTracking); // GET /reproduction/offspring/:offspringId/tracking
router.put('/offspring/:offspringId/tracking', updateOffspringTracking); // PUT /reproduction/offspring/:offspringId/tracking
router.patch('/offspring/:offspringId/wean', recordWeaning); // PATCH /reproduction/offspring/:offspringId/wean
router.patch('/offspring/:offspringId/sell', recordSale); // PATCH /reproduction/offspring/:offspringId/sell
router.patch('/offspring/:offspringId/death', recordOffspringDeath); // PATCH /reproduction/offspring/:offspringId/death
router.patch('/offspring/:offspringId/growth', recordGrowthMeasurement); // PATCH /reproduction/offspring/:offspringId/growth
router.get('/offspring/dam/:damId', getOffspringByDam); // GET /reproduction/offspring/dam/:damId
router.get('/offspring/sire/:sireId', getOffspringBySire); // GET /reproduction/offspring/sire/:sireId
router.get('/offspring/statistics/farm/:farmId', getOffspringStatistics); // GET /reproduction/offspring/statistics/farm/:farmId

// ===== DASHBOARD & OVERVIEW =====
router.get('/dashboard/farm/:farmId', getReproductionDashboard); // GET /reproduction/dashboard/farm/:farmId

// ===== ANIMAL REPRODUCTION SUMMARY =====
router.get('/summary/animal/:animalId', async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    
    // Import services
    const matingEventService = require('./matingEvent.service');
    const pregnancyService = require('./pregnancy.service');
    const birthEventService = require('./birthEvent.service');
    const offspringTrackingService = require('./offspringTracking.service');
    
    // Get animal details
    const Animal = require('../../animalRecords/animal.model');
    const animal = await Animal.findById(animalId);
    
    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }
    
    // Get reproduction data based on gender
    let summary = {
      animal: {
        name: animal.name,
        tagNumber: animal.tagNumber,
        gender: animal.gender,
        breed: animal.breed,
        reproductiveStatus: animal.reproductiveStatus,
      },
    };
    
    if (animal.gender === 'female') {
      // For females: pregnancies, births, offspring
      const [pregnancies, births, offspring] = await Promise.all([
        pregnancyService.getAnimalPregnancies(animalId, userId, { limit: 10 }),
        birthEventService.getAnimalBirthEvents(animalId, userId, { limit: 10 }),
        offspringTrackingService.getOffspringByDam(animalId, userId, { limit: 10 }),
      ]);
      
      summary.femaleData = {
        pregnancies: pregnancies.pregnancies,
        births: births.events,
        offspring: offspring.offspring,
        totalPregnancies: pregnancies.pagination.totalRecords,
        totalBirths: births.pagination.totalRecords,
        totalOffspring: offspring.pagination.totalRecords,
      };
    } else if (animal.gender === 'male') {
      // For males: matings as sire, offspring
      const [matings, offspring] = await Promise.all([
        matingEventService.getAnimalMatingEvents(animalId, userId, 'sire', { limit: 10 }),
        offspringTrackingService.getOffspringBySire(animalId, userId, { limit: 10 }),
      ]);
      
      summary.maleData = {
        matings: matings.events,
        offspring: offspring.offspring,
        totalMatings: matings.pagination.totalRecords,
        totalOffspring: offspring.pagination.totalRecords,
        successRate: 0, // Would calculate from mating outcomes
      };
    }
    
    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching animal reproduction summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reproduction summary',
    });
  }
});

module.exports = router;