// src/modules/animals/operations/health-vaccination/healthRecord.controller.js
const healthRecordService = require('./healthRecord.service');

// Create health record
const createHealthRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const recordData = req.body;

    // Validate required fields
    if (!recordData.animal || !recordData.condition || !recordData.startDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Animal, condition, and start date are required',
      });
    }

    const healthRecord = await healthRecordService.createHealthRecord(recordData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Health record created successfully',
      data: healthRecord,
    });
  } catch (error) {
    console.error('Error creating health record:', error);
    
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

    res.status(500).json({
      status: 'error',
      message: 'Failed to create health record',
    });
  }
};

// Get health records for an animal
const getAnimalHealthRecords = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const filters = req.query;

    const result = await healthRecordService.getAnimalHealthRecords(animalId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal health records:', error);
    
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
      message: 'Failed to fetch health records',
    });
  }
};

// Get health record by ID
const getHealthRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const healthRecord = await healthRecordService.getHealthRecordById(recordId, userId);

    if (!healthRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Health record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: healthRecord,
    });
  } catch (error) {
    console.error('Error fetching health record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch health record',
    });
  }
};

// Update health record
const updateHealthRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;
    const updateData = req.body;

    const updatedRecord = await healthRecordService.updateHealthRecord(recordId, userId, updateData);

    if (!updatedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Health record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Health record updated successfully',
      data: updatedRecord,
    });
  } catch (error) {
    console.error('Error updating health record:', error);
    
    if (error.message === 'Cannot change animal or farm reference') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update health record',
    });
  }
};

// Mark health record as resolved
const markHealthRecordResolved = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const healthRecord = await healthRecordService.markHealthRecordResolved(recordId, userId);

    if (!healthRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Health record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Health record marked as resolved',
      data: healthRecord,
    });
  } catch (error) {
    console.error('Error marking health record as resolved:', error);
    
    if (error.message === 'Only ongoing health records can be marked as resolved') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to mark health record as resolved',
    });
  }
};

// Delete health record
const deleteHealthRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { recordId } = req.params;

    const healthRecord = await healthRecordService.deleteHealthRecord(recordId, userId);

    if (!healthRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Health record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Health record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting health record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete health record',
    });
  }
};

// Get animal health summary
const getAnimalHealthSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;

    const summary = await healthRecordService.getAnimalHealthSummary(animalId, userId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching animal health summary:', error);
    
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
      message: 'Failed to fetch health summary',
    });
  }
};

// Get health alerts for a farm
const getHealthAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await healthRecordService.getHealthAlerts(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching health alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch health alerts',
    });
  }
};

module.exports = {
  createHealthRecord,
  getAnimalHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  markHealthRecordResolved,
  deleteHealthRecord,
  getAnimalHealthSummary,
  getHealthAlerts,
};