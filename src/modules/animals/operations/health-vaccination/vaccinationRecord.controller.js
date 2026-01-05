// src/modules/animals/operations/health-vaccination/vaccinationRecord.controller.js
const vaccinationRecordService = require('./vaccinationRecord.service');

// Create vaccination record
const createVaccinationRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const vaccineData = req.body;

    // Validate required fields
    if (!vaccineData.animal || !vaccineData.vaccineName || 
        !vaccineData.doseNumber || !vaccineData.dateAdministered) {
      return res.status(400).json({
        status: 'error',
        message: 'Animal, vaccine name, dose number, and date administered are required',
      });
    }

    const vaccinationRecord = await vaccinationRecordService.createVaccinationRecord(vaccineData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Vaccination record created successfully',
      data: vaccinationRecord,
    });
  } catch (error) {
    console.error('Error creating vaccination record:', error);
    
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
    
    if (error.message.includes('already administered')) {
      return res.status(409).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create vaccination record',
    });
  }
};

// Get vaccination records for an animal
const getAnimalVaccinationRecords = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const filters = req.query;

    const result = await vaccinationRecordService.getAnimalVaccinationRecords(animalId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal vaccination records:', error);
    
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
      message: 'Failed to fetch vaccination records',
    });
  }
};

// Get vaccination record by ID
const getVaccinationRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const vaccinationRecord = await vaccinationRecordService.getVaccinationRecordById(recordId, userId);

    if (!vaccinationRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Vaccination record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: vaccinationRecord,
    });
  } catch (error) {
    console.error('Error fetching vaccination record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch vaccination record',
    });
  }
};

// Update vaccination record
const updateVaccinationRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;
    const updateData = req.body;

    const updatedRecord = await vaccinationRecordService.updateVaccinationRecord(recordId, userId, updateData);

    if (!updatedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Vaccination record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Vaccination record updated successfully',
      data: updatedRecord,
    });
  } catch (error) {
    console.error('Error updating vaccination record:', error);
    
    if (error.message.includes('Cannot change')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update vaccination record',
    });
  }
};

// Delete vaccination record
const deleteVaccinationRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const vaccinationRecord = await vaccinationRecordService.deleteVaccinationRecord(recordId, userId);

    if (!vaccinationRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Vaccination record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Vaccination record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vaccination record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete vaccination record',
    });
  }
};

// Get animal vaccination summary
const getAnimalVaccinationSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;

    const summary = await vaccinationRecordService.getAnimalVaccinationSummary(animalId, userId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching animal vaccination summary:', error);
    
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
      message: 'Failed to fetch vaccination summary',
    });
  }
};

// Get vaccination alerts for a farm
const getVaccinationAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await vaccinationRecordService.getVaccinationAlerts(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching vaccination alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch vaccination alerts',
    });
  }
};

// Mark vaccination reminder as sent
const markReminderSent = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const vaccinationRecord = await vaccinationRecordService.markReminderSent(recordId, userId);

    if (!vaccinationRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Vaccination record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Reminder marked as sent',
      data: vaccinationRecord,
    });
  } catch (error) {
    console.error('Error marking reminder as sent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark reminder as sent',
    });
  }
};

module.exports = {
  createVaccinationRecord,
  getAnimalVaccinationRecords,
  getVaccinationRecord,
  updateVaccinationRecord,
  deleteVaccinationRecord,
  getAnimalVaccinationSummary,
  getVaccinationAlerts,
  markReminderSent,
};