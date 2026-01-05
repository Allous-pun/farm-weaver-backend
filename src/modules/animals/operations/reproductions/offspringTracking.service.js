// src/modules/animals/operations/reproductions/offspringTracking.service.js
const OffspringTracking = require('./offspringTracking.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const BirthEvent = require('./birthEvent.model');

class OffspringTrackingService {
  // Get offspring tracking for an animal
  async getOffspringTracking(offspringId, userId) {
    try {
      // Verify animal exists and user has permission
      const animal = await Animal.findById(offspringId);
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
      
      // Get tracking record
      const tracking = await OffspringTracking.findOne({ offspring: offspringId })
        .populate('dam', 'name tagNumber gender breed')
        .populate('sire', 'name tagNumber gender breed')
        .populate('birthEvent')
        .populate('recordedBy', 'firstName lastName');
      
      if (!tracking) {
        // Create tracking record if it doesn't exist (for older animals)
        return await this.createTrackingForExistingAnimal(offspringId, userId);
      }
      
      // Update cached details
      await tracking.updateOffspringDetails();
      
      // Add virtual fields
      const trackingObj = new OffspringTracking(tracking.toObject());
      const trackingWithVirtuals = {
        ...tracking.toObject(),
        ageInDays: trackingObj.ageInDays,
        isWeaned: trackingObj.isWeaned,
        currentWeight: trackingObj.currentWeight,
      };
      
      return trackingWithVirtuals;
    } catch (error) {
      console.error('Service error getting offspring tracking:', error);
      throw error;
    }
  }
  
  // Create tracking record for existing animal
  async createTrackingForExistingAnimal(animalId, userId) {
    try {
      const animal = await Animal.findById(animalId)
        .populate('sire')
        .populate('dam')
        .populate('birthEvent');
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Check if tracking already exists
      const existingTracking = await OffspringTracking.findOne({ offspring: animalId });
      if (existingTracking) {
        return existingTracking;
      }
      
      // Create tracking record
      const trackingData = {
        farm: animal.farm,
        birthEvent: animal.birthEvent,
        dam: animal.dam,
        sire: animal.sire,
        offspring: animal._id,
        offspringDetails: {
          tagNumber: animal.tagNumber,
          name: animal.name,
          gender: animal.gender,
          breed: animal.breed,
          dateOfBirth: animal.dateOfBirth,
        },
        recordedBy: userId,
        status: animal.status === 'deceased' ? 'died' : 'alive',
      };
      
      if (animal.status === 'deceased' && animal.dateOfDeath) {
        trackingData.deathDetails = {
          date: animal.dateOfDeath,
          cause: 'unknown',
        };
      }
      
      const tracking = await OffspringTracking.create(trackingData);
      
      return tracking;
    } catch (error) {
      console.error('Service error creating tracking for existing animal:', error);
      throw error;
    }
  }
  
  // Update offspring tracking
  async updateOffspringTracking(offspringId, userId, updateData) {
    try {
      const tracking = await this.getOffspringTracking(offspringId, userId);
      
      if (!tracking) {
        return null;
      }
      
      // Don't allow changing offspring, dam, sire, or farm
      if (updateData.offspring || updateData.dam || updateData.sire || updateData.farm) {
        throw new Error('Cannot change offspring, dam, sire, or farm reference');
      }
      
      // Update tracking
      const updatedTracking = await OffspringTracking.findOneAndUpdate(
        { offspring: offspringId },
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
      .populate('dam', 'name tagNumber gender breed')
      .populate('sire', 'name tagNumber gender breed');
      
      // Update animal record if status changed
      if (updateData.status && updateData.status !== tracking.status) {
        await this.updateAnimalFromTracking(offspringId, updateData);
      }
      
      return updatedTracking;
    } catch (error) {
      console.error('Service error updating offspring tracking:', error);
      throw error;
    }
  }
  
  // Update animal record from tracking
  async updateAnimalFromTracking(offspringId, trackingData) {
    try {
      const update = {};
      
      if (trackingData.status === 'died' && trackingData.deathDetails) {
        update.status = 'deceased';
        update.dateOfDeath = trackingData.deathDetails.date;
      } else if (trackingData.status === 'sold') {
        update.status = 'sold';
      } else if (trackingData.status === 'culled') {
        update.status = 'culled';
      } else if (trackingData.status === 'transferred') {
        update.status = 'transferred';
      }
      
      if (Object.keys(update).length > 0) {
        await Animal.findByIdAndUpdate(offspringId, update);
      }
    } catch (error) {
      console.error('Error updating animal from tracking:', error);
    }
  }
  
  // Record offspring weaning
  async recordWeaning(offspringId, userId, weaningData) {
    try {
      const tracking = await this.getOffspringTracking(offspringId, userId);
      
      if (!tracking) {
        return null;
      }
      
      if (tracking.status !== 'alive') {
        throw new Error('Only alive offspring can be weaned');
      }
      
      const updateData = {
        status: 'weaned',
        weaningDate: weaningData.weaningDate || new Date(),
      };
      
      if (weaningData.weaningWeight) {
        updateData.weaningWeight = weaningData.weaningWeight;
      }
      
      if (weaningData.notes) {
        updateData.notes = weaningData.notes;
      }
      
      const updatedTracking = await OffspringTracking.findOneAndUpdate(
        { offspring: offspringId },
        updateData,
        { new: true }
      );
      
      return updatedTracking;
    } catch (error) {
      console.error('Service error recording weaning:', error);
      throw error;
    }
  }
  
  // Record offspring sale
  async recordSale(offspringId, userId, saleData) {
    try {
      const tracking = await this.getOffspringTracking(offspringId, userId);
      
      if (!tracking) {
        return null;
      }
      
      if (!['alive', 'weaned'].includes(tracking.status)) {
        throw new Error('Only alive or weaned offspring can be sold');
      }
      
      const updateData = {
        status: 'sold',
        statusDate: saleData.saleDate || new Date(),
        saleDetails: {
          date: saleData.saleDate || new Date(),
          price: saleData.price,
          buyer: saleData.buyer,
          contact: saleData.contact,
        },
      };
      
      if (saleData.notes) {
        updateData.notes = saleData.notes;
      }
      
      const updatedTracking = await OffspringTracking.findOneAndUpdate(
        { offspring: offspringId },
        updateData,
        { new: true }
      );
      
      return updatedTracking;
    } catch (error) {
      console.error('Service error recording sale:', error);
      throw error;
    }
  }
  
  // Record offspring death
  async recordDeath(offspringId, userId, deathData) {
    try {
      const tracking = await this.getOffspringTracking(offspringId, userId);
      
      if (!tracking) {
        return null;
      }
      
      if (tracking.status === 'died') {
        throw new Error('Offspring is already marked as died');
      }
      
      const updateData = {
        status: 'died',
        statusDate: deathData.deathDate || new Date(),
        deathDetails: {
          date: deathData.deathDate || new Date(),
          cause: deathData.cause,
          notes: deathData.notes,
        },
      };
      
      const updatedTracking = await OffspringTracking.findOneAndUpdate(
        { offspring: offspringId },
        updateData,
        { new: true }
      );
      
      return updatedTracking;
    } catch (error) {
      console.error('Service error recording death:', error);
      throw error;
    }
  }
  
  // Record growth measurement
  async recordGrowthMeasurement(offspringId, userId, measurementData) {
    try {
      const tracking = await this.getOffspringTracking(offspringId, userId);
      
      if (!tracking) {
        return null;
      }
      
      if (!['alive', 'weaned'].includes(tracking.status)) {
        throw new Error('Cannot record growth for non-alive offspring');
      }
      
      const measurement = {
        date: measurementData.date || new Date(),
        weight: measurementData.weight,
        height: measurementData.height,
        notes: measurementData.notes,
      };
      
      const updatedTracking = await OffspringTracking.findOneAndUpdate(
        { offspring: offspringId },
        {
          $push: { growthMeasurements: measurement }
        },
        { new: true }
      );
      
      return updatedTracking;
    } catch (error) {
      console.error('Service error recording growth measurement:', error);
      throw error;
    }
  }
  
  // Get offspring by dam (mother)
  async getOffspringByDam(damId, userId, filters = {}) {
    try {
      // Verify dam exists and user has permission
      const dam = await Animal.findById(damId);
      if (!dam) {
        throw new Error('Dam not found');
      }
      
      const farm = await Farm.findOne({
        _id: dam.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Build query
      const query = { dam: damId };
      
      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Only show active by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get offspring tracking records
      const offspringRecords = await OffspringTracking.find(query)
        .populate('offspring', 'name tagNumber gender status dateOfBirth breed')
        .populate('sire', 'name tagNumber breed')
        .populate('birthEvent')
        .sort({ 'offspringDetails.dateOfBirth': -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await OffspringTracking.countDocuments(query);
      
      // Add virtual fields
      const recordsWithVirtuals = offspringRecords.map(record => {
        const recordObj = new OffspringTracking(record);
        return {
          ...record,
          ageInDays: recordObj.ageInDays,
          isWeaned: recordObj.isWeaned,
          currentWeight: recordObj.currentWeight,
        };
      });
      
      return {
        offspring: recordsWithVirtuals,
        dam: {
          name: dam.name,
          tagNumber: dam.tagNumber,
          breed: dam.breed,
          totalOffspring: totalRecords,
        },
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
      console.error('Service error getting offspring by dam:', error);
      throw error;
    }
  }
  
  // Get offspring by sire (father)
  async getOffspringBySire(sireId, userId, filters = {}) {
    try {
      // Verify sire exists and user has permission
      const sire = await Animal.findById(sireId);
      if (!sire) {
        throw new Error('Sire not found');
      }
      
      const farm = await Farm.findOne({
        _id: sire.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Build query
      const query = { sire: sireId };
      
      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      
      // Only show active by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get offspring tracking records
      const offspringRecords = await OffspringTracking.find(query)
        .populate('offspring', 'name tagNumber gender status dateOfBirth breed')
        .populate('dam', 'name tagNumber breed')
        .populate('birthEvent')
        .sort({ 'offspringDetails.dateOfBirth': -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await OffspringTracking.countDocuments(query);
      
      return {
        offspring: offspringRecords,
        sire: {
          name: sire.name,
          tagNumber: sire.tagNumber,
          breed: sire.breed,
          totalOffspring: totalRecords,
        },
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
      console.error('Service error getting offspring by sire:', error);
      throw error;
    }
  }
  
  // Get offspring statistics
  async getOffspringStatistics(farmId, userId) {
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
      
      // Get all offspring tracking for the farm
      const allOffspring = await OffspringTracking.find({ farm: farmId, isActive: true })
        .populate('offspring', 'species breed')
        .populate('dam', 'name tagNumber')
        .populate('sire', 'name tagNumber')
        .lean();
      
      const stats = {
        totalOffspring: allOffspring.length,
        byStatus: {},
        bySpecies: {},
        byBreed: {},
        survivalRate: 0,
        weaningRate: 0,
        averageWeaningAge: 0,
        topDams: {},
        topSires: {},
      };
      
      let totalAlive = 0;
      let totalWeaned = 0;
      let totalWeaningAge = 0;
      let weaningCount = 0;
      
      allOffspring.forEach(offspring => {
        // Count by status
        const status = offspring.status || 'alive';
        if (!stats.byStatus[status]) {
          stats.byStatus[status] = 0;
        }
        stats.byStatus[status]++;
        
        if (status === 'alive' || status === 'weaned') {
          totalAlive++;
        }
        
        if (status === 'weaned') {
          totalWeaned++;
          if (offspring.weaningDate && offspring.offspringDetails?.dateOfBirth) {
            const weaningAge = Math.ceil(
              (new Date(offspring.weaningDate) - new Date(offspring.offspringDetails.dateOfBirth)) / 
              (1000 * 60 * 60 * 24)
            );
            totalWeaningAge += weaningAge;
            weaningCount++;
          }
        }
        
        // Count by species
        const species = offspring.offspring?.species || 'unknown';
        if (!stats.bySpecies[species]) {
          stats.bySpecies[species] = 0;
        }
        stats.bySpecies[species]++;
        
        // Count by breed
        const breed = offspring.offspring?.breed || 'unknown';
        if (!stats.byBreed[breed]) {
          stats.byBreed[breed] = 0;
        }
        stats.byBreed[breed]++;
        
        // Track dam performance
        const damId = offspring.dam?._id?.toString();
        if (damId) {
          if (!stats.topDams[damId]) {
            stats.topDams[damId] = {
              name: offspring.dam?.name || 'Unknown',
              tagNumber: offspring.dam?.tagNumber || 'Unknown',
              totalOffspring: 0,
              aliveOffspring: 0,
              weanedOffspring: 0,
            };
          }
          stats.topDams[damId].totalOffspring++;
          if (['alive', 'weaned', 'sold'].includes(offspring.status)) {
            stats.topDams[damId].aliveOffspring++;
          }
          if (offspring.status === 'weaned') {
            stats.topDams[damId].weanedOffspring++;
          }
        }
        
        // Track sire performance
        const sireId = offspring.sire?._id?.toString();
        if (sireId) {
          if (!stats.topSires[sireId]) {
            stats.topSires[sireId] = {
              name: offspring.sire?.name || 'Unknown',
              tagNumber: offspring.sire?.tagNumber || 'Unknown',
              totalOffspring: 0,
              aliveOffspring: 0,
            };
          }
          stats.topSires[sireId].totalOffspring++;
          if (['alive', 'weaned', 'sold'].includes(offspring.status)) {
            stats.topSires[sireId].aliveOffspring++;
          }
        }
      });
      
      // Calculate rates
      stats.survivalRate = stats.totalOffspring > 0 ?
        (totalAlive / stats.totalOffspring) * 100 : 0;
      
      stats.weaningRate = stats.totalOffspring > 0 ?
        (totalWeaned / stats.totalOffspring) * 100 : 0;
      
      stats.averageWeaningAge = weaningCount > 0 ?
        totalWeaningAge / weaningCount : 0;
      
      // Sort top performers
      stats.topDams = Object.values(stats.topDams)
        .sort((a, b) => b.totalOffspring - a.totalOffspring)
        .slice(0, 10);
      
      stats.topSires = Object.values(stats.topSires)
        .sort((a, b) => b.totalOffspring - a.totalOffspring)
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      console.error('Service error getting offspring statistics:', error);
      throw error;
    }
  }
}

module.exports = new OffspringTrackingService();