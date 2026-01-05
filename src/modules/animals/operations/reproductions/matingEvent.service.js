// src/modules/animals/operations/reproductions/matingEvent.service.js
const MatingEvent = require('./matingEvent.model');
const Animal = require('../../animalRecords/animal.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const Farm = require('../../../farms/farm.model');

class MatingEventService {
  // Create mating event
  async createMatingEvent(matingData, userId) {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: matingData.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Verify sire exists and is male
      const sire = await Animal.findById(matingData.sire);
      if (!sire || sire.gender !== 'male') {
        throw new Error('Sire not found or is not male');
      }
      
      // Verify dams exist and are female
      if (!matingData.dams || matingData.dams.length === 0) {
        throw new Error('At least one dam is required');
      }
      
      const dams = [];
      for (const damId of matingData.dams) {
        const dam = await Animal.findById(damId);
        if (!dam || dam.gender !== 'female') {
          throw new Error(`Dam ${damId} not found or is not female`);
        }
        
        // Check if dam is already pregnant
        const Pregnancy = require('./pregnancy.model');
        const existingPregnancy = await Pregnancy.findOne({
          dam: damId,
          status: { $in: ['confirmed', 'progressing'] },
          isActive: true,
        });
        
        if (existingPregnancy) {
          throw new Error(`Dam ${dam.tagNumber || damId} is already pregnant`);
        }
        
        dams.push(dam);
      }
      
      // Check animal type features
      const sireType = await AnimalType.findById(sire.animalType);
      if (!sireType || !sireType.features?.reproduction) {
        throw new Error('Reproduction module is not enabled for sire animal type');
      }
      
      // For each dam, check features
      for (const dam of dams) {
        const damType = await AnimalType.findById(dam.animalType);
        if (!damType || !damType.features?.reproduction) {
          throw new Error(`Reproduction module is not enabled for dam ${dam.tagNumber || dam._id}`);
        }
      }
      
      // Add metadata
      matingData.recordedBy = userId;
      
      // Create mating event
      const matingEvent = await MatingEvent.create(matingData);
      
      return matingEvent;
    } catch (error) {
      console.error('Service error creating mating event:', error);
      throw error;
    }
  }
  
  // Get mating events for an animal
  async getAnimalMatingEvents(animalId, userId, role = 'any', filters = {}) {
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
      
      // Build query based on role (sire, dam, or any)
      let query = { farm: animal.farm };
      
      if (role === 'sire') {
        query.sire = animalId;
      } else if (role === 'dam') {
        query.dams = animalId;
      } else {
        // Any role - animal is either sire or dam
        query.$or = [
          { sire: animalId },
          { dams: animalId }
        ];
      }
      
      // Apply filters
      if (filters.matingType) {
        query.matingType = filters.matingType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.outcome) {
        query.outcome = filters.outcome;
      }
      
      // Date filters
      if (filters.startDate) {
        query.matingDate = query.matingDate || {};
        query.matingDate.$gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        query.matingDate = query.matingDate || {};
        query.matingDate.$lte = new Date(filters.endDate);
      }
      
      // Only show active by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get mating events with population
      const matingEvents = await MatingEvent.find(query)
        .populate('sire', 'name tagNumber gender breed')
        .populate('dams', 'name tagNumber gender breed')
        .sort({ matingDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await MatingEvent.countDocuments(query);
      
      return {
        events: matingEvents,
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
      console.error('Service error getting animal mating events:', error);
      throw error;
    }
  }
  
  // Get mating event by ID
  async getMatingEventById(eventId, userId) {
    try {
      const matingEvent = await MatingEvent.findById(eventId)
        .populate('sire', 'name tagNumber gender breed animalType')
        .populate('dams', 'name tagNumber gender breed animalType')
        .populate('previousMatingEvent');
      
      if (!matingEvent) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: matingEvent.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      return matingEvent;
    } catch (error) {
      console.error('Service error getting mating event:', error);
      throw error;
    }
  }
  
  // Update mating event
  async updateMatingEvent(eventId, userId, updateData) {
    try {
      const matingEvent = await this.getMatingEventById(eventId, userId);
      
      if (!matingEvent) {
        return null;
      }
      
      // Don't allow changing farm
      if (updateData.farm) {
        throw new Error('Cannot change farm reference');
      }
      
      // If changing sire or dams, validate
      if (updateData.sire) {
        const sire = await Animal.findById(updateData.sire);
        if (!sire || sire.gender !== 'male') {
          throw new Error('Sire not found or is not male');
        }
      }
      
      if (updateData.dams) {
        for (const damId of updateData.dams) {
          const dam = await Animal.findById(damId);
          if (!dam || dam.gender !== 'female') {
            throw new Error(`Dam ${damId} not found or is not female`);
          }
        }
      }
      
      // Update mating event
      const updatedEvent = await MatingEvent.findByIdAndUpdate(
        eventId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
      .populate('sire', 'name tagNumber gender breed')
      .populate('dams', 'name tagNumber gender breed');
      
      return updatedEvent;
    } catch (error) {
      console.error('Service error updating mating event:', error);
      throw error;
    }
  }
  
  // Record mating outcome (success/failure)
  async recordMatingOutcome(eventId, userId, outcomeData) {
    try {
      const matingEvent = await this.getMatingEventById(eventId, userId);
      
      if (!matingEvent) {
        return null;
      }
      
      if (!['completed', 'failed'].includes(outcomeData.status)) {
        throw new Error('Invalid status. Must be "completed" or "failed"');
      }
      
      const updateData = {
        status: outcomeData.status,
        outcome: outcomeData.outcome || 'unknown',
        outcomeDate: new Date(),
      };
      
      if (outcomeData.notes) {
        updateData.notes = outcomeData.notes;
      }
      
      const updatedEvent = await MatingEvent.findByIdAndUpdate(
        eventId,
        updateData,
        { new: true }
      );
      
      // If mating was successful, create pregnancy records for each dam
      if (outcomeData.outcome === 'successful') {
        await this.createPregnanciesFromMating(eventId, userId);
      }
      
      return updatedEvent;
    } catch (error) {
      console.error('Service error recording mating outcome:', error);
      throw error;
    }
  }
  
  // Create pregnancies from successful mating
  async createPregnanciesFromMating(matingEventId, userId) {
    try {
      const matingEvent = await MatingEvent.findById(matingEventId)
        .populate('sire')
        .populate('dams');
      
      if (!matingEvent || matingEvent.outcome !== 'successful') {
        return [];
      }
      
      const Pregnancy = require('./pregnancy.model');
      const pregnancies = [];
      
      // Get gestation period from animal type
      const sireType = await AnimalType.findById(matingEvent.sire.animalType);
      const defaultGestation = sireType?.gestationDays || 30; // Default 30 days for rabbits
      
      for (const dam of matingEvent.dams) {
        const damType = await AnimalType.findById(dam.animalType);
        const gestationDays = damType?.gestationDays || defaultGestation;
        
        const conceptionDate = matingEvent.expectedConceptionDate || matingEvent.matingDate;
        const expectedDeliveryDate = new Date(conceptionDate);
        expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + gestationDays);
        
        const pregnancyData = {
          farm: matingEvent.farm,
          dam: dam._id,
          sire: matingEvent.sire._id,
          matingEvent: matingEventId,
          conceptionDate,
          confirmedDate: new Date(),
          expectedGestationDays: gestationDays,
          expectedDeliveryDate,
          recordedBy: userId,
        };
        
        const pregnancy = await Pregnancy.create(pregnancyData);
        pregnancies.push(pregnancy);
      }
      
      return pregnancies;
    } catch (error) {
      console.error('Service error creating pregnancies:', error);
      throw error;
    }
  }
  
  // Delete mating event (soft delete)
  async deleteMatingEvent(eventId, userId) {
    try {
      const matingEvent = await this.getMatingEventById(eventId, userId);
      
      if (!matingEvent) {
        return null;
      }
      
      // Check if there are associated pregnancies
      const Pregnancy = require('./pregnancy.model');
      const pregnancies = await Pregnancy.find({
        matingEvent: eventId,
        isActive: true,
      });
      
      if (pregnancies.length > 0) {
        throw new Error('Cannot delete mating event with associated pregnancies');
      }
      
      // Soft delete
      matingEvent.isActive = false;
      await matingEvent.save();
      
      return matingEvent;
    } catch (error) {
      console.error('Service error deleting mating event:', error);
      throw error;
    }
  }
  
  // Get mating statistics for a farm
  async getMatingStatistics(farmId, userId, period = 'year') {
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
      
      // Get mating events in period
      const matingEvents = await MatingEvent.find({
        farm: farmId,
        matingDate: { $gte: startDate },
        isActive: true,
      })
      .populate('sire', 'name tagNumber breed')
      .populate('dams', 'name tagNumber breed')
      .lean();
      
      // Calculate statistics
      const stats = {
        totalMatingEvents: matingEvents.length,
        successfulMatings: 0,
        failedMatings: 0,
        pendingMatings: 0,
        byMatingType: {},
        byOutcome: {},
        byMonth: {},
        topSires: {},
        topDams: {},
        successRate: 0,
      };
      
      matingEvents.forEach(event => {
        // Count by mating type
        if (!stats.byMatingType[event.matingType]) {
          stats.byMatingType[event.matingType] = 0;
        }
        stats.byMatingType[event.matingType]++;
        
        // Count by outcome
        const outcome = event.outcome || 'unknown';
        if (!stats.byOutcome[outcome]) {
          stats.byOutcome[outcome] = 0;
        }
        stats.byOutcome[outcome]++;
        
        // Count by month
        const month = new Date(event.matingDate).toISOString().slice(0, 7); // YYYY-MM
        if (!stats.byMonth[month]) {
          stats.byMonth[month] = 0;
        }
        stats.byMonth[month]++;
        
        // Track sire performance
        const sireId = event.sire?._id?.toString();
        if (sireId) {
          if (!stats.topSires[sireId]) {
            stats.topSires[sireId] = {
              name: event.sire?.name || 'Unknown',
              tagNumber: event.sire?.tagNumber || 'Unknown',
              totalMatings: 0,
              successfulMatings: 0,
            };
          }
          stats.topSires[sireId].totalMatings++;
          if (event.outcome === 'successful') {
            stats.topSires[sireId].successfulMatings++;
          }
        }
        
        // Track dam performance
        event.dams.forEach(dam => {
          const damId = dam?._id?.toString();
          if (damId) {
            if (!stats.topDams[damId]) {
              stats.topDams[damId] = {
                name: dam?.name || 'Unknown',
                tagNumber: dam?.tagNumber || 'Unknown',
                totalMatings: 0,
                successfulMatings: 0,
              };
            }
            stats.topDams[damId].totalMatings++;
            if (event.outcome === 'successful') {
              stats.topDams[damId].successfulMatings++;
            }
          }
        });
        
        // Count overall outcomes
        if (event.outcome === 'successful') {
          stats.successfulMatings++;
        } else if (event.outcome === 'unsuccessful') {
          stats.failedMatings++;
        } else if (!event.outcome) {
          stats.pendingMatings++;
        }
      });
      
      // Calculate success rate
      const totalWithOutcome = stats.successfulMatings + stats.failedMatings;
      stats.successRate = totalWithOutcome > 0 ? 
        (stats.successfulMatings / totalWithOutcome) * 100 : 0;
      
      // Sort top sires and dams by success rate
      stats.topSires = Object.values(stats.topSires)
        .sort((a, b) => {
          const rateA = a.totalMatings > 0 ? a.successfulMatings / a.totalMatings : 0;
          const rateB = b.totalMatings > 0 ? b.successfulMatings / b.totalMatings : 0;
          return rateB - rateA;
        })
        .slice(0, 10);
      
      stats.topDams = Object.values(stats.topDams)
        .sort((a, b) => {
          const rateA = a.totalMatings > 0 ? a.successfulMatings / a.totalMatings : 0;
          const rateB = b.totalMatings > 0 ? b.successfulMatings / b.totalMatings : 0;
          return rateB - rateA;
        })
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      console.error('Service error getting mating statistics:', error);
      throw error;
    }
  }
}

module.exports = new MatingEventService();