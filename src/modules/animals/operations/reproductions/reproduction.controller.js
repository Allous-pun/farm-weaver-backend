// src/modules/animals/operations/reproductions/reproduction.controller.js
const matingEventService = require('./matingEvent.service');
const pregnancyService = require('./pregnancy.service');
const birthEventService = require('./birthEvent.service');
const offspringTrackingService = require('./offspringTracking.service');

// Import models
const MatingEvent = require('./matingEvent.model');
const Pregnancy = require('./pregnancy.model');
const BirthEvent = require('./birthEvent.model');

// ===== MATING EVENT CONTROLLERS =====

// Create mating event
const createMatingEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const matingData = req.body;

    // Validate required fields
    if (!matingData.farm || !matingData.sire || !matingData.dams || !matingData.matingDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Farm, sire, dams, and mating date are required',
      });
    }

    const matingEvent = await matingEventService.createMatingEvent(matingData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Mating event created successfully',
      data: matingEvent,
    });
  } catch (error) {
    console.error('Error creating mating event:', error);
    
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('not enabled')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('already pregnant')) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create mating event',
    });
  }
};

// Get mating events for an animal
const getAnimalMatingEvents = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const { role = 'any', ...filters } = req.query;

    const result = await matingEventService.getAnimalMatingEvents(animalId, userId, role, filters);

    res.status(200).json({
      status: 'success',
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal mating events:', error);
    
    if (error.message === 'Animal not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch mating events',
    });
  }
};

// Get mating event by ID
const getMatingEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;

    const matingEvent = await matingEventService.getMatingEventById(eventId, userId);

    if (!matingEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Mating event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: matingEvent,
    });
  } catch (error) {
    console.error('Error fetching mating event:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch mating event',
    });
  }
};

// Update mating event
const updateMatingEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;
    const updateData = req.body;

    const updatedEvent = await matingEventService.updateMatingEvent(eventId, userId, updateData);

    if (!updatedEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Mating event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Mating event updated successfully',
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Error updating mating event:', error);
    
    if (error.message.includes('Cannot change') || error.message.includes('not found') || error.message.includes('not male') || error.message.includes('not female')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update mating event',
    });
  }
};

// Record mating outcome
const recordMatingOutcome = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;
    const outcomeData = req.body;

    const updatedEvent = await matingEventService.recordMatingOutcome(eventId, userId, outcomeData);

    if (!updatedEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Mating event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Mating outcome recorded successfully',
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Error recording mating outcome:', error);
    
    if (error.message.includes('Invalid status')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record mating outcome',
    });
  }
};

// Delete mating event
const deleteMatingEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;

    const matingEvent = await matingEventService.deleteMatingEvent(eventId, userId);

    if (!matingEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Mating event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Mating event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting mating event:', error);
    
    if (error.message.includes('with associated pregnancies')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete mating event',
    });
  }
};

// Get mating statistics
const getMatingStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const { period = 'year' } = req.query;

    const stats = await matingEventService.getMatingStatistics(farmId, userId, period);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching mating statistics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch mating statistics',
    });
  }
};

// ===== PREGNANCY CONTROLLERS =====

// Create pregnancy record
const createPregnancy = async (req, res) => {
  try {
    const userId = req.userId;
    const pregnancyData = req.body;

    // Validate required fields
    if (!pregnancyData.farm || !pregnancyData.dam || !pregnancyData.sire || 
        !pregnancyData.matingEvent || !pregnancyData.conceptionDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Farm, dam, sire, mating event, and conception date are required',
      });
    }

    const pregnancy = await pregnancyService.createPregnancy(pregnancyData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Pregnancy record created successfully',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Error creating pregnancy record:', error);
    
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('not enabled')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('already pregnant')) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create pregnancy record',
    });
  }
};

// Get animal pregnancies
const getAnimalPregnancies = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const filters = req.query;

    const result = await pregnancyService.getAnimalPregnancies(animalId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.pregnancies,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal pregnancies:', error);
    
    if (error.message === 'Animal not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pregnancies',
    });
  }
};

// Get pregnancy by ID
const getPregnancy = async (req, res) => {
  try {
    const userId = req.userId;
    const { pregnancyId } = req.params;

    const pregnancy = await pregnancyService.getPregnancyById(pregnancyId, userId);

    if (!pregnancy) {
      return res.status(404).json({
        status: 'error',
        message: 'Pregnancy not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Error fetching pregnancy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pregnancy',
    });
  }
};

// Update pregnancy
const updatePregnancy = async (req, res) => {
  try {
    const userId = req.userId;
    const { pregnancyId } = req.params;
    const updateData = req.body;

    const updatedPregnancy = await pregnancyService.updatePregnancy(pregnancyId, userId, updateData);

    if (!updatedPregnancy) {
      return res.status(404).json({
        status: 'error',
        message: 'Pregnancy not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Pregnancy updated successfully',
      data: updatedPregnancy,
    });
  } catch (error) {
    console.error('Error updating pregnancy:', error);
    
    if (error.message.includes('Cannot change')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update pregnancy',
    });
  }
};

// Record pregnancy checkup
const recordPregnancyCheckup = async (req, res) => {
  try {
    const userId = req.userId;
    const { pregnancyId } = req.params;
    const checkupData = req.body;

    const pregnancy = await pregnancyService.recordPregnancyCheckup(pregnancyId, userId, checkupData);

    if (!pregnancy) {
      return res.status(404).json({
        status: 'error',
        message: 'Pregnancy not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Pregnancy checkup recorded successfully',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Error recording pregnancy checkup:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record pregnancy checkup',
    });
  }
};

// Mark pregnancy as terminated
const markPregnancyTerminated = async (req, res) => {
  try {
    const userId = req.userId;
    const { pregnancyId } = req.params;
    const terminationData = req.body;

    const pregnancy = await pregnancyService.markPregnancyTerminated(pregnancyId, userId, terminationData);

    if (!pregnancy) {
      return res.status(404).json({
        status: 'error',
        message: 'Pregnancy not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Pregnancy marked as terminated',
      data: pregnancy,
    });
  } catch (error) {
    console.error('Error terminating pregnancy:', error);
    
    if (error.message.includes('Invalid status')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to terminate pregnancy',
    });
  }
};

// Get pregnancy alerts
const getPregnancyAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await pregnancyService.getPregnancyAlerts(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching pregnancy alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pregnancy alerts',
    });
  }
};

// Get pregnancy statistics
const getPregnancyStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const { period = 'year' } = req.query;

    const stats = await pregnancyService.getPregnancyStatistics(farmId, userId, period);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching pregnancy statistics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pregnancy statistics',
    });
  }
};

// ===== BIRTH EVENT CONTROLLERS =====

// Create birth event
const createBirthEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const birthData = req.body;

    // Validate required fields
    if (!birthData.farm || !birthData.pregnancy || !birthData.dam || !birthData.sire || 
        !birthData.birthDate || birthData.totalOffspring === undefined || birthData.liveBirths === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Farm, pregnancy, dam, sire, birth date, total offspring, and live births are required',
      });
    }

    const birthEvent = await birthEventService.createBirthEvent(birthData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Birth event created successfully',
      data: birthEvent,
    });
  } catch (error) {
    console.error('Error creating birth event:', error);
    
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('not ready')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('cannot exceed')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create birth event',
    });
  }
};

// Get animal birth events
const getAnimalBirthEvents = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const filters = req.query;

    const result = await birthEventService.getAnimalBirthEvents(animalId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal birth events:', error);
    
    if (error.message === 'Animal not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch birth events',
    });
  }
};

// Get birth event by ID
const getBirthEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;

    const birthEvent = await birthEventService.getBirthEventById(eventId, userId);

    if (!birthEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Birth event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: birthEvent,
    });
  } catch (error) {
    console.error('Error fetching birth event:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch birth event',
    });
  }
};

// Update birth event
const updateBirthEvent = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;
    const updateData = req.body;

    const updatedEvent = await birthEventService.updateBirthEvent(eventId, userId, updateData);

    if (!updatedEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Birth event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Birth event updated successfully',
      data: updatedEvent,
    });
  } catch (error) {
    console.error('Error updating birth event:', error);
    
    if (error.message.includes('Cannot change')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update birth event',
    });
  }
};

// Mark birth event as completed
const markBirthEventCompleted = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;

    const birthEvent = await birthEventService.markBirthEventCompleted(eventId, userId);

    if (!birthEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Birth event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Birth event marked as completed',
      data: birthEvent,
    });
  } catch (error) {
    console.error('Error marking birth event as completed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark birth event as completed',
    });
  }
};

// Record neonatal death
const recordNeonatalDeath = async (req, res) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;
    const deathData = req.body;

    const birthEvent = await birthEventService.recordNeonatalDeath(eventId, userId, deathData);

    if (!birthEvent) {
      return res.status(404).json({
        status: 'error',
        message: 'Birth event not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Neonatal death recorded successfully',
      data: birthEvent,
    });
  } catch (error) {
    console.error('Error recording neonatal death:', error);
    
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record neonatal death',
    });
  }
};

// Get birth statistics
const getBirthStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const { period = 'year' } = req.query;

    const stats = await birthEventService.getBirthStatistics(farmId, userId, period);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching birth statistics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch birth statistics',
    });
  }
};

// ===== OFFSPRING TRACKING CONTROLLERS =====

// Get offspring tracking
const getOffspringTracking = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;

    const tracking = await offspringTrackingService.getOffspringTracking(offspringId, userId);

    res.status(200).json({
      status: 'success',
      data: tracking,
    });
  } catch (error) {
    console.error('Error fetching offspring tracking:', error);
    
    if (error.message === 'Animal not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch offspring tracking',
    });
  }
};

// Update offspring tracking
const updateOffspringTracking = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;
    const updateData = req.body;

    const tracking = await offspringTrackingService.updateOffspringTracking(offspringId, userId, updateData);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Offspring tracking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Offspring tracking updated successfully',
      data: tracking,
    });
  } catch (error) {
    console.error('Error updating offspring tracking:', error);
    
    if (error.message.includes('Cannot change')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update offspring tracking',
    });
  }
};

// Record offspring weaning
const recordWeaning = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;
    const weaningData = req.body;

    const tracking = await offspringTrackingService.recordWeaning(offspringId, userId, weaningData);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Offspring tracking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Weaning recorded successfully',
      data: tracking,
    });
  } catch (error) {
    console.error('Error recording weaning:', error);
    
    if (error.message.includes('Only alive offspring')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record weaning',
    });
  }
};

// Record offspring sale
const recordSale = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;
    const saleData = req.body;

    const tracking = await offspringTrackingService.recordSale(offspringId, userId, saleData);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Offspring tracking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Sale recorded successfully',
      data: tracking,
    });
  } catch (error) {
    console.error('Error recording sale:', error);
    
    if (error.message.includes('Only alive or weaned')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record sale',
    });
  }
};

// Record offspring death
const recordOffspringDeath = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;
    const deathData = req.body;

    const tracking = await offspringTrackingService.recordDeath(offspringId, userId, deathData);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Offspring tracking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Death recorded successfully',
      data: tracking,
    });
  } catch (error) {
    console.error('Error recording death:', error);
    
    if (error.message.includes('already marked as died')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record death',
    });
  }
};

// Record growth measurement
const recordGrowthMeasurement = async (req, res) => {
  try {
    const userId = req.userId;
    const { offspringId } = req.params;
    const measurementData = req.body;

    const tracking = await offspringTrackingService.recordGrowthMeasurement(offspringId, userId, measurementData);

    if (!tracking) {
      return res.status(404).json({
        status: 'error',
        message: 'Offspring tracking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Growth measurement recorded successfully',
      data: tracking,
    });
  } catch (error) {
    console.error('Error recording growth measurement:', error);
    
    if (error.message.includes('Cannot record growth')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to record growth measurement',
    });
  }
};

// Get offspring by dam
const getOffspringByDam = async (req, res) => {
  try {
    const userId = req.userId;
    const { damId } = req.params;
    const filters = req.query;

    const result = await offspringTrackingService.getOffspringByDam(damId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.offspring,
      dam: result.dam,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching offspring by dam:', error);
    
    if (error.message === 'Dam not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch offspring by dam',
    });
  }
};

// Get offspring by sire
const getOffspringBySire = async (req, res) => {
  try {
    const userId = req.userId;
    const { sireId } = req.params;
    const filters = req.query;

    const result = await offspringTrackingService.getOffspringBySire(sireId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.offspring,
      sire: result.sire,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching offspring by sire:', error);
    
    if (error.message === 'Sire not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch offspring by sire',
    });
  }
};

// Get offspring statistics
const getOffspringStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const stats = await offspringTrackingService.getOffspringStatistics(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching offspring statistics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch offspring statistics',
    });
  }
};

// ===== REPRODUCTION DASHBOARD =====

// Get reproduction dashboard
const getReproductionDashboard = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    // Import models here to avoid circular dependencies
    const MatingEvent = require('./matingEvent.model');
    const Pregnancy = require('./pregnancy.model');
    const BirthEvent = require('./birthEvent.model');
    const OffspringTracking = require('./offspringTracking.model');
    const Animal = require('../../animalRecords/animal.model');
    const Farm = require('../../../farms/farm.model');

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Calculate statistics manually
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    // Get counts
    const [
      totalMatingEvents,
      totalPregnancies,
      totalBirthEvents,
      totalOffspringTrackings
    ] = await Promise.all([
      MatingEvent.countDocuments({ farm: farmId, isActive: true }),
      Pregnancy.countDocuments({ farm: farmId, isActive: true }),
      BirthEvent.countDocuments({ farm: farmId, isActive: true }),
      OffspringTracking.countDocuments({ farm: farmId, isActive: true })
    ]);

    // Get recent events
    const recentMatings = await MatingEvent.find({
      farm: farmId,
      isActive: true
    })
      .populate('sire', 'name tagNumber gender breed')
      .populate('dams', 'name tagNumber gender breed')
      .sort({ matingDate: -1 })
      .limit(5)
      .lean();

    const recentPregnancies = await Pregnancy.find({
      farm: farmId,
      isActive: true,
      status: { $in: ['confirmed', 'progressing'] }
    })
      .populate('dam', 'name tagNumber gender breed')
      .populate('sire', 'name tagNumber gender breed')
      .sort({ expectedDeliveryDate: -1 })
      .limit(5)
      .lean();

    const recentBirths = await BirthEvent.find({
      farm: farmId,
      isActive: true
    })
      .populate('dam', 'name tagNumber gender breed')
      .populate('sire', 'name tagNumber gender breed')
      .sort({ birthDate: -1 })
      .limit(5)
      .lean();

    // Calculate simple statistics
    const successfulMatings = await MatingEvent.countDocuments({
      farm: farmId,
      outcome: 'successful',
      isActive: true
    });
    
    const matingSuccessRate = totalMatingEvents > 0 ? 
      (successfulMatings / totalMatingEvents) * 100 : 0;

    const currentPregnancies = await Pregnancy.countDocuments({
      farm: farmId,
      status: { $in: ['confirmed', 'progressing'] },
      isActive: true
    });

    const deliveredPregnancies = await Pregnancy.countDocuments({
      farm: farmId,
      status: 'delivered',
      isActive: true
    });

    const pregnancySuccessRate = totalPregnancies > 0 ? 
      (deliveredPregnancies / totalPregnancies) * 100 : 0;

    // Get pregnancy alerts (due soon and overdue)
    const dueSoonPregnancies = await Pregnancy.find({
      farm: farmId,
      status: 'progressing',
      expectedDeliveryDate: { 
        $gte: now,
        $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      },
      isActive: true
    }).populate('dam', 'name tagNumber');

    const overduePregnancies = await Pregnancy.find({
      farm: farmId,
      status: 'progressing',
      expectedDeliveryDate: { $lt: now },
      isActive: true
    }).populate('dam', 'name tagNumber');

    const pregnancyAlerts = {
      dueSoon: dueSoonPregnancies,
      overdue: overduePregnancies,
      withComplications: [], // You can add this logic later
      totalAlerts: dueSoonPregnancies.length + overduePregnancies.length,
      summary: {
        dueSoon: dueSoonPregnancies.length,
        overdue: overduePregnancies.length,
        complications: 0
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalMatings: totalMatingEvents,
          totalPregnancies: totalPregnancies,
          totalBirths: totalBirthEvents,
          totalOffspring: totalOffspringTrackings,
          overallSuccessRate: matingSuccessRate,
        },
        statistics: {
          mating: {
            totalMatingEvents,
            successfulMatings,
            successRate: matingSuccessRate
          },
          pregnancy: {
            totalPregnancies,
            currentPregnancies,
            deliveredPregnancies,
            successRate: pregnancySuccessRate
          },
          birth: {
            totalBirthEvents,
            totalOffspringBorn: 0, // You'll need to calculate this from birth events
            averageLitterSize: 0 // Calculate from birth events
          },
          offspring: {
            totalOffspring: totalOffspringTrackings
          }
        },
        recentActivity: {
          matings: recentMatings,
          pregnancies: recentPregnancies,
          births: recentBirths,
        },
        alerts: {
          pregnancy: pregnancyAlerts,
          totalAlerts: pregnancyAlerts.totalAlerts,
        },
        performanceMetrics: {
          fertilityRate: matingSuccessRate,
          pregnancySuccessRate: pregnancySuccessRate,
          averageLitterSize: 0,
          offspringSurvivalRate: 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching reproduction dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reproduction dashboard',
    });
  }
};

module.exports = {
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
};