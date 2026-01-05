// src/modules/animals/operations/health-vaccination/healthRecord.service.js
const HealthRecord = require('./healthRecord.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');

class HealthRecordService {
  // Create health record
  async createHealthRecord(recordData, userId) {
    try {
      // Verify animal exists
      const animal = await Animal.findById(recordData.animal);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Verify animal type has health vaccinations enabled
      const animalType = await AnimalType.findById(animal.animalType);
      
      if (!animalType || !animalType.features?.healthVaccinations) {
        throw new Error('Health & vaccinations module is not enabled for this animal type');
      }
      
      // Add metadata
      recordData.farm = animal.farm;
      recordData.recordedBy = userId;
      
      // If it's a death record, update animal status
      if (recordData.recordType === 'death') {
        recordData.status = 'fatal';
        animal.status = 'deceased';
        animal.dateOfDeath = recordData.deathDate || new Date();
        await animal.save();
      }
      
      // Create health record
      const healthRecord = await HealthRecord.create(recordData);
      
      return healthRecord;
    } catch (error) {
      console.error('Service error creating health record:', error);
      throw error;
    }
  }
  
  // Get health records for an animal
  async getAnimalHealthRecords(animalId, userId, filters = {}) {
    try {
      // Verify animal exists and user has permission
      const animal = await Animal.findById(animalId);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Build query
      const query = { animal: animalId };
      
      // Apply filters
      if (filters.recordType) {
        query.recordType = filters.recordType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.severity) {
        query.severity = filters.severity;
      }
      
      // Date filters
      if (filters.startDate) {
        query.startDate = { $gte: new Date(filters.startDate) };
      }
      
      if (filters.endDate) {
        query.endDate = query.endDate || {};
        query.endDate.$lte = new Date(filters.endDate);
      }
      
      // Only show active records by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get records
      const records = await HealthRecord.find(query)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await HealthRecord.countDocuments(query);
      
      return {
        records,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          hasNextPage: page * limit < totalRecords,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Service error getting animal health records:', error);
      throw error;
    }
  }
  
  // Get health record by ID
  async getHealthRecordById(recordId, userId) {
    try {
      const healthRecord = await HealthRecord.findById(recordId);
      
      if (!healthRecord) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: healthRecord.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      return healthRecord;
    } catch (error) {
      console.error('Service error getting health record:', error);
      throw error;
    }
  }
  
  // Update health record
  async updateHealthRecord(recordId, userId, updateData) {
    try {
      const healthRecord = await this.getHealthRecordById(recordId, userId);
      
      if (!healthRecord) {
        return null;
      }
      
      // Don't allow changing animal or farm
      if (updateData.animal || updateData.farm) {
        throw new Error('Cannot change animal or farm reference');
      }
      
      // If updating to death record, update animal status
      if (updateData.recordType === 'death' || healthRecord.recordType === 'death') {
        updateData.status = 'fatal';
        
        const animal = await Animal.findById(healthRecord.animal);
        if (animal) {
          animal.status = 'deceased';
          animal.dateOfDeath = updateData.deathDate || healthRecord.deathDate || new Date();
          await animal.save();
        }
      }
      
      // Update record
      const updatedRecord = await HealthRecord.findByIdAndUpdate(
        recordId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      
      return updatedRecord;
    } catch (error) {
      console.error('Service error updating health record:', error);
      throw error;
    }
  }
  
  // Mark health record as resolved
  async markHealthRecordResolved(recordId, userId) {
    try {
      const healthRecord = await this.getHealthRecordById(recordId, userId);
      
      if (!healthRecord) {
        return null;
      }
      
      // Can only resolve ongoing records
      if (healthRecord.status !== 'ongoing') {
        throw new Error('Only ongoing health records can be marked as resolved');
      }
      
      healthRecord.status = 'resolved';
      healthRecord.endDate = new Date();
      await healthRecord.save();
      
      return healthRecord;
    } catch (error) {
      console.error('Service error marking health record as resolved:', error);
      throw error;
    }
  }
  
  // Delete health record (soft delete)
  async deleteHealthRecord(recordId, userId) {
    try {
      const healthRecord = await this.getHealthRecordById(recordId, userId);
      
      if (!healthRecord) {
        return null;
      }
      
      // Soft delete
      healthRecord.isActive = false;
      await healthRecord.save();
      
      return healthRecord;
    } catch (error) {
      console.error('Service error deleting health record:', error);
      throw error;
    }
  }
  
  // Get animal health summary
  async getAnimalHealthSummary(animalId, userId) {
    try {
      // Verify animal exists and user has permission
      const animal = await Animal.findById(animalId);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get recent health records (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const recentRecords = await HealthRecord.find({
        animal: animalId,
        startDate: { $gte: ninetyDaysAgo },
        isActive: true,
      })
      .sort({ startDate: -1 })
      .limit(10)
      .lean();
      
      // Count ongoing issues
      const ongoingIssues = await HealthRecord.countDocuments({
        animal: animalId,
        status: 'ongoing',
        recordType: { $in: ['illness', 'injury'] },
        isActive: true,
      });
      
      // Get most common conditions
      const conditionStats = await HealthRecord.aggregate([
        {
          $match: {
            animal: animal._id,
            isActive: true,
            recordType: { $in: ['illness', 'injury'] }
          }
        },
        {
          $group: {
            _id: '$condition',
            count: { $sum: 1 },
            lastOccurrence: { $max: '$startDate' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      
      // Calculate total treatment cost (last year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const costStats = await HealthRecord.aggregate([
        {
          $match: {
            animal: animal._id,
            startDate: { $gte: oneYearAgo },
            isActive: true,
            'cost.amount': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$cost.amount' },
            avgCost: { $avg: '$cost.amount' },
            recordCount: { $sum: 1 }
          }
        }
      ]);
      
      return {
        animal: {
          name: animal.name,
          tagNumber: animal.tagNumber,
          healthStatus: animal.healthStatus,
          species: animal.species,
        },
        summary: {
          ongoingIssues,
          totalRecords: recentRecords.length,
          recentConditions: conditionStats,
          treatmentCost: costStats[0] || { totalCost: 0, avgCost: 0, recordCount: 0 },
          healthTrend: this.calculateHealthTrend(recentRecords),
        },
        recentRecords,
      };
    } catch (error) {
      console.error('Service error getting animal health summary:', error);
      throw error;
    }
  }
  
  // Calculate health trend from recent records
  calculateHealthTrend(records) {
    if (records.length === 0) return 'stable';
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const recentRecords = records.filter(record => 
      new Date(record.startDate) >= lastMonth
    );
    
    const ongoingCount = recentRecords.filter(r => r.status === 'ongoing').length;
    const resolvedCount = recentRecords.filter(r => r.status === 'resolved').length;
    
    if (ongoingCount > 2) return 'declining';
    if (resolvedCount > ongoingCount * 2) return 'improving';
    return 'stable';
  }
  
  // Get health alerts for a farm
  async getHealthAlerts(farmId, userId) {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Get animals with ongoing critical issues
      const criticalIssues = await HealthRecord.find({
        farm: farmId,
        status: 'ongoing',
        severity: 'critical',
        isActive: true,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      // Get health records requiring followup
      const followupAlerts = await HealthRecord.find({
        farm: farmId,
        requiresFollowup: true,
        followupDate: { $lte: sevenDaysFromNow },
        isActive: true,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      // Get long-running illnesses (> 14 days)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const longRunningIssues = await HealthRecord.find({
        farm: farmId,
        status: 'ongoing',
        startDate: { $lte: twoWeeksAgo },
        isActive: true,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      return {
        criticalIssues,
        followupAlerts,
        longRunningIssues,
        totalAlerts: criticalIssues.length + followupAlerts.length + longRunningIssues.length,
        summary: {
          critical: criticalIssues.length,
          followup: followupAlerts.length,
          longRunning: longRunningIssues.length,
        },
      };
    } catch (error) {
      console.error('Service error getting health alerts:', error);
      throw error;
    }
  }
}

module.exports = new HealthRecordService();