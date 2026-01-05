// src/modules/animals/operations/reproductions/pregnancy.service.js
const Pregnancy = require('./pregnancy.model');
const Animal = require('../../animalRecords/animal.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const Farm = require('../../../farms/farm.model');
const MatingEvent = require('./matingEvent.model');

class PregnancyService {
  // Create pregnancy record
  async createPregnancy(pregnancyData, userId) {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: pregnancyData.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Verify dam exists and is female
      const dam = await Animal.findById(pregnancyData.dam);
      if (!dam || dam.gender !== 'female') {
        throw new Error('Dam not found or is not female');
      }
      
      // Verify sire exists and is male
      const sire = await Animal.findById(pregnancyData.sire);
      if (!sire || sire.gender !== 'male') {
        throw new Error('Sire not found or is not male');
      }
      
      // Verify mating event exists
      const matingEvent = await MatingEvent.findById(pregnancyData.matingEvent);
      if (!matingEvent) {
        throw new Error('Mating event not found');
      }
      
      // Check animal type features
      const damType = await AnimalType.findById(dam.animalType);
      if (!damType || !damType.features?.reproduction) {
        throw new Error('Reproduction module is not enabled for dam animal type');
      }
      
      // Check if dam is already pregnant
      const existingPregnancy = await Pregnancy.findOne({
        dam: pregnancyData.dam,
        status: { $in: ['confirmed', 'progressing'] },
        isActive: true,
      });
      
      if (existingPregnancy) {
        throw new Error('Dam is already pregnant');
      }
      
      // Add metadata
      pregnancyData.recordedBy = userId;
      
      // Create pregnancy
      const pregnancy = await Pregnancy.create(pregnancyData);
      
      // Update dam's reproductive status
      await Animal.findByIdAndUpdate(pregnancyData.dam, {
        reproductiveStatus: 'pregnant',
      });
      
      return pregnancy;
    } catch (error) {
      console.error('Service error creating pregnancy:', error);
      throw error;
    }
  }
  
  // Get pregnancies for an animal (as dam)
  async getAnimalPregnancies(animalId, userId, filters = {}) {
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
      const query = { dam: animalId };
      
      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Date filters
      if (filters.startDate) {
        query.conceptionDate = query.conceptionDate || {};
        query.conceptionDate.$gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        query.conceptionDate = query.conceptionDate || {};
        query.conceptionDate.$lte = new Date(filters.endDate);
      }
      
      // Only show active by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get pregnancies with population
      const pregnancies = await Pregnancy.find(query)
        .populate('dam', 'name tagNumber gender breed')
        .populate('sire', 'name tagNumber gender breed')
        .populate('matingEvent')
        .sort({ conceptionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await Pregnancy.countDocuments(query);
      
      // Add virtual fields
      const pregnanciesWithVirtuals = pregnancies.map(pregnancy => {
        const pregObj = new Pregnancy(pregnancy);
        return {
          ...pregnancy,
          daysPregnant: pregObj.daysPregnant,
          daysRemaining: pregObj.daysRemaining,
          gestationProgress: pregObj.gestationProgress,
          isOverdue: pregObj.isOverdue,
        };
      });
      
      return {
        pregnancies: pregnanciesWithVirtuals,
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
      console.error('Service error getting animal pregnancies:', error);
      throw error;
    }
  }
  
  // Get pregnancy by ID
  async getPregnancyById(pregnancyId, userId) {
    try {
      const pregnancy = await Pregnancy.findById(pregnancyId)
        .populate('dam', 'name tagNumber gender breed animalType')
        .populate('sire', 'name tagNumber gender breed')
        .populate('matingEvent')
        .populate('recordedBy', 'firstName lastName');
      
      if (!pregnancy) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: pregnancy.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      // Add virtual fields
      const pregObj = new Pregnancy(pregnancy.toObject());
      const pregnancyWithVirtuals = {
        ...pregnancy.toObject(),
        daysPregnant: pregObj.daysPregnant,
        daysRemaining: pregObj.daysRemaining,
        gestationProgress: pregObj.gestationProgress,
        isOverdue: pregObj.isOverdue,
      };
      
      return pregnancyWithVirtuals;
    } catch (error) {
      console.error('Service error getting pregnancy:', error);
      throw error;
    }
  }
  
  // Update pregnancy
  async updatePregnancy(pregnancyId, userId, updateData) {
    try {
      const pregnancy = await this.getPregnancyById(pregnancyId, userId);
      
      if (!pregnancy) {
        return null;
      }
      
      // Don't allow changing dam, sire, or farm
      if (updateData.dam || updateData.sire || updateData.farm) {
        throw new Error('Cannot change dam, sire, or farm reference');
      }
      
      // Update pregnancy
      const updatedPregnancy = await Pregnancy.findByIdAndUpdate(
        pregnancyId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
      .populate('dam', 'name tagNumber gender breed')
      .populate('sire', 'name tagNumber gender breed');
      
      return updatedPregnancy;
    } catch (error) {
      console.error('Service error updating pregnancy:', error);
      throw error;
    }
  }
  
  // Record pregnancy checkup
  async recordPregnancyCheckup(pregnancyId, userId, checkupData) {
    try {
      const pregnancy = await Pregnancy.findById(pregnancyId);
      
      if (!pregnancy) {
        return null;
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: pregnancy.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      // Add checkup
      if (!pregnancy.checkups) {
        pregnancy.checkups = [];
      }
      
      pregnancy.checkups.push({
        date: new Date(),
        ...checkupData,
      });
      
      await pregnancy.save();
      
      return pregnancy;
    } catch (error) {
      console.error('Service error recording pregnancy checkup:', error);
      throw error;
    }
  }
  
  // Record pregnancy complication
  async recordPregnancyComplication(pregnancyId, userId, complicationData) {
    try {
      const pregnancy = await Pregnancy.findById(pregnancyId);
      
      if (!pregnancy) {
        return null;
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: pregnancy.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      // Add complication
      if (!pregnancy.complications) {
        pregnancy.complications = [];
      }
      
      pregnancy.complications.push({
        date: new Date(),
        ...complicationData,
      });
      
      await pregnancy.save();
      
      return pregnancy;
    } catch (error) {
      console.error('Service error recording pregnancy complication:', error);
      throw error;
    }
  }
  
  // Mark pregnancy as aborted/failed
  async markPregnancyTerminated(pregnancyId, userId, terminationData) {
    try {
      const pregnancy = await Pregnancy.findById(pregnancyId);
      
      if (!pregnancy) {
        return null;
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: pregnancy.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      if (!['aborted', 'failed'].includes(terminationData.status)) {
        throw new Error('Invalid status. Must be "aborted" or "failed"');
      }
      
      pregnancy.status = terminationData.status;
      pregnancy.abortionDate = new Date();
      pregnancy.abortionReason = terminationData.reason;
      pregnancy.abortionNotes = terminationData.notes;
      
      await pregnancy.save();
      
      // Update dam's reproductive status
      await Animal.findByIdAndUpdate(pregnancy.dam, {
        reproductiveStatus: 'open',
      });
      
      return pregnancy;
    } catch (error) {
      console.error('Service error terminating pregnancy:', error);
      throw error;
    }
  }
  
  // Get pregnancy alerts for a farm
  async getPregnancyAlerts(farmId, userId) {
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
      
      // Get pregnancies due soon (within 7 days)
      const dueSoonPregnancies = await Pregnancy.find({
        farm: farmId,
        status: 'progressing',
        expectedDeliveryDate: { $lte: sevenDaysFromNow, $gte: now },
        isActive: true,
      })
      .populate('dam', 'name tagNumber breed')
      .populate('sire', 'name tagNumber breed')
      .lean();
      
      // Get overdue pregnancies
      const overduePregnancies = await Pregnancy.find({
        farm: farmId,
        status: 'progressing',
        expectedDeliveryDate: { $lt: now },
        isActive: true,
      })
      .populate('dam', 'name tagNumber breed')
      .populate('sire', 'name tagNumber breed')
      .lean();
      
      // Get pregnancies with complications
      const pregnanciesWithComplications = await Pregnancy.find({
        farm: farmId,
        status: { $in: ['confirmed', 'progressing'] },
        'complications.resolved': false,
        isActive: true,
      })
      .populate('dam', 'name tagNumber breed')
      .lean();
      
      return {
        dueSoon: dueSoonPregnancies,
        overdue: overduePregnancies,
        withComplications: pregnanciesWithComplications,
        totalAlerts: dueSoonPregnancies.length + overduePregnancies.length + pregnanciesWithComplications.length,
        summary: {
          dueSoon: dueSoonPregnancies.length,
          overdue: overduePregnancies.length,
          complications: pregnanciesWithComplications.length,
        },
      };
    } catch (error) {
      console.error('Service error getting pregnancy alerts:', error);
      throw error;
    }
  }
  
  // Get pregnancy statistics for a farm
  async getPregnancyStatistics(farmId, userId, period = 'year') {
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
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'quarter':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'year':
          startDate = new Date(now.setDate(now.getDate() - 365));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }
      
      // Get pregnancies in period
      const pregnancies = await Pregnancy.find({
        farm: farmId,
        conceptionDate: { $gte: startDate },
        isActive: true,
      })
      .populate('dam', 'name tagNumber breed')
      .populate('sire', 'name tagNumber breed')
      .lean();
      
      // Calculate statistics
      const stats = {
        totalPregnancies: pregnancies.length,
        currentPregnancies: 0,
        deliveredPregnancies: 0,
        terminatedPregnancies: 0,
        successRate: 0,
        byStatus: {},
        byMonth: {},
        averageGestationDays: 0,
        topDams: {},
      };
      
      let totalGestationDays = 0;
      let gestationCount = 0;
      
      pregnancies.forEach(pregnancy => {
        // Count by status
        if (!stats.byStatus[pregnancy.status]) {
          stats.byStatus[pregnancy.status] = 0;
        }
        stats.byStatus[pregnancy.status]++;
        
        // Count overall
        if (['confirmed', 'progressing'].includes(pregnancy.status)) {
          stats.currentPregnancies++;
        } else if (pregnancy.status === 'delivered') {
          stats.deliveredPregnancies++;
        } else if (['aborted', 'failed'].includes(pregnancy.status)) {
          stats.terminatedPregnancies++;
        }
        
        // Count by month
        const month = new Date(pregnancy.conceptionDate).toISOString().slice(0, 7);
        if (!stats.byMonth[month]) {
          stats.byMonth[month] = 0;
        }
        stats.byMonth[month]++;
        
        // Track dam performance
        const damId = pregnancy.dam?._id?.toString();
        if (damId) {
          if (!stats.topDams[damId]) {
            stats.topDams[damId] = {
              name: pregnancy.dam?.name || 'Unknown',
              tagNumber: pregnancy.dam?.tagNumber || 'Unknown',
              totalPregnancies: 0,
              successfulPregnancies: 0,
            };
          }
          stats.topDams[damId].totalPregnancies++;
          if (pregnancy.status === 'delivered') {
            stats.topDams[damId].successfulPregnancies++;
          }
        }
        
        // Calculate gestation if delivered
        if (pregnancy.status === 'delivered' && pregnancy.actualDeliveryDate) {
          const gestationDays = Math.ceil(
            (new Date(pregnancy.actualDeliveryDate) - new Date(pregnancy.conceptionDate)) / 
            (1000 * 60 * 60 * 24)
          );
          totalGestationDays += gestationDays;
          gestationCount++;
        }
      });
      
      // Calculate averages
      stats.successRate = stats.totalPregnancies > 0 ?
        (stats.deliveredPregnancies / stats.totalPregnancies) * 100 : 0;
      
      stats.averageGestationDays = gestationCount > 0 ?
        totalGestationDays / gestationCount : 0;
      
      // Sort top dams by success rate
      stats.topDams = Object.values(stats.topDams)
        .sort((a, b) => {
          const rateA = a.totalPregnancies > 0 ? a.successfulPregnancies / a.totalPregnancies : 0;
          const rateB = b.totalPregnancies > 0 ? b.successfulPregnancies / b.totalPregnancies : 0;
          return rateB - rateA;
        })
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      console.error('Service error getting pregnancy statistics:', error);
      throw error;
    }
  }
}

module.exports = new PregnancyService();