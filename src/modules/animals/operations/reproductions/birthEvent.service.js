// src/modules/animals/operations/reproductions/birthEvent.service.js
const BirthEvent = require('./birthEvent.model');
const Pregnancy = require('./pregnancy.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const OffspringTracking = require('./offspringTracking.model');

class BirthEventService {
  // Create birth event
  async createBirthEvent(birthData, userId) {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: birthData.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Verify pregnancy exists and is progressing or confirmed
      const pregnancy = await Pregnancy.findById(birthData.pregnancy);
      if (!pregnancy || !['progressing', 'confirmed'].includes(pregnancy.status)) {
        throw new Error('Pregnancy not found or not ready for birth');
      }
      
      // Verify dam exists
      const dam = await Animal.findById(birthData.dam);
      if (!dam || dam.gender !== 'female') {
        throw new Error('Dam not found or is not female');
      }
      
      // Verify sire exists
      const sire = await Animal.findById(birthData.sire);
      if (!sire || sire.gender !== 'male') {
        throw new Error('Sire not found or is not male');
      }
      
      // Validate offspring counts
      if (birthData.totalOffspring < 0) {
        throw new Error('Total offspring cannot be negative');
      }
      
      if (birthData.liveBirths > birthData.totalOffspring) {
        throw new Error('Live births cannot exceed total offspring');
      }
      
      if (birthData.stillbirths > birthData.totalOffspring) {
        throw new Error('Stillbirths cannot exceed total offspring');
      }
      
      if (birthData.weakOffspring > birthData.liveBirths) {
        throw new Error('Weak offspring cannot exceed live births');
      }
      
      // Add metadata
      birthData.recordedBy = userId;
      
      // Create birth event
      const birthEvent = await BirthEvent.create(birthData);
      
      // Update pregnancy status
      await Pregnancy.findByIdAndUpdate(birthData.pregnancy, {
        status: 'delivered',
        actualDeliveryDate: birthData.birthDate,
      });
      
      // Create offspring animal records if there are live births
      if (birthData.liveBirths > 0) {
        await this.createOffspringRecords(birthEvent._id, userId);
      }
      
      return birthEvent;
    } catch (error) {
      console.error('Service error creating birth event:', error);
      throw error;
    }
  }
  
  // Create offspring animal records from birth event
  async createOffspringRecords(birthEventId, userId) {
    try {
      const birthEvent = await BirthEvent.findById(birthEventId)
        .populate('dam', 'animalType breed name tagNumber')
        .populate('sire', 'animalType breed name tagNumber');

      if (!birthEvent || birthEvent.liveBirths === 0) {
        return [];
      }

      const offspringRecords = [];

      // Get dam and sire details
      const dam = birthEvent.dam;
      const sire = birthEvent.sire;

      // Get animal type - use dam's animalType, fallback to sire's
      const animalType = dam.animalType || sire.animalType;

      if (!animalType) {
        throw new Error('Cannot determine animal type for offspring');
      }

      // Get the animal type record to get species name for tag generation
      const AnimalTypeModel = require('../../../animalTypes/animalType.model');
      const animalTypeId = animalType && (animalType._id || animalType);
      const animalTypeRecord = await AnimalTypeModel.findById(animalTypeId);
      const speciesName = animalTypeRecord?.name || 'UNK';
      const speciesCode = this.getSpeciesCode(speciesName);

      // Generate offspring
      for (let i = 0; i < birthEvent.liveBirths; i++) {
        // Determine gender (simplified - in real app, would be recorded per offspring)
        const gender = i < birthEvent.maleOffspring ? 'male' : 'female';

        // Generate tag number
        const tagNumber = await this.generateOffspringTagNumber(
          birthEvent.farm,
          speciesCode,
          birthEvent.birthDate
        );

        // Create offspring animal record
        const offspringData = {
          name: `${speciesName} Offspring ${i + 1}`,
          tagNumber,
          animalType: animalType, // REQUIRED FIELD
          gender,
          breed: dam.breed || sire.breed || speciesName,
          dateOfBirth: birthEvent.birthDate,
          farm: birthEvent.farm,
          status: 'alive',
          healthStatus: 'good',
          reproductiveStatus: 'immature',
          createdBy: userId,
          // Parent references
          sire: sire._id,
          dam: dam._id,
          birthEvent: birthEventId,
        };

        const offspring = await Animal.create(offspringData);

        // Create offspring tracking record
        const trackingData = {
          farm: birthEvent.farm,
          birthEvent: birthEventId,
          dam: dam._id,
          sire: sire._id,
          offspring: offspring._id,
          offspringDetails: {
            tagNumber: offspring.tagNumber,
            name: offspring.name,
            gender: offspring.gender,
            breed: offspring.breed,
            dateOfBirth: offspring.dateOfBirth,
          },
          recordedBy: userId,
        };

        // Add birth weight if available (could be parameterized)
        if (birthEvent.birthWeight) {
          trackingData.birthWeight = birthEvent.birthWeight;
        }

        const tracking = await OffspringTracking.create(trackingData);

        // Add offspring to birth event
        birthEvent.offspring.push(offspring._id);

        offspringRecords.push({
          animal: offspring,
          tracking: tracking,
        });
      }

      // Update birth event with offspring references
      await birthEvent.save();

      return offspringRecords;
    } catch (error) {
      console.error('Service error creating offspring records:', error);
      throw error;
    }
  }
  
  // Generate offspring tag number
  async generateOffspringTagNumber(farmId, speciesCode, birthDate) {
    try {
      const farm = await Farm.findById(farmId);
      if (!farm) return `${speciesCode}001`;

      const year = new Date(birthDate).getFullYear().toString().slice(-2);

      // Count existing animals for this farm this year with similar tag pattern
      const startOfYear = new Date(new Date(birthDate).getFullYear(), 0, 1);
      const endOfYear = new Date(new Date(birthDate).getFullYear() + 1, 0, 1);

      const existingCount = await Animal.countDocuments({
        farm: farmId,
        dateOfBirth: { $gte: startOfYear, $lt: endOfYear },
        tagNumber: new RegExp(`^${speciesCode}${year}\\d{3}$`)
      });

      const sequence = (existingCount + 1).toString().padStart(3, '0');
      return `${speciesCode}${year}${sequence}`;
    } catch (error) {
      console.error('Error generating tag number:', error);
      return `${speciesCode}${new Date().getFullYear().toString().slice(-2)}001`;
    }
  }

  // Helper method to get species code from name
  getSpeciesCode(speciesName) {
    const codeMap = {
      'rabbit': 'RAB',
      'chicken': 'CHK',
      'cow': 'COW',
      'goat': 'GOA',
      'sheep': 'SHP',
      'pig': 'PIG',
    };
    
    const lowerName = (speciesName || '').toLowerCase();
    for (const [key, code] of Object.entries(codeMap)) {
      if (lowerName.includes(key)) {
        return code;
      }
    }
    
    // Default: take first 3 letters of species name
    return (speciesName || 'UNK').substring(0, 3).toUpperCase();
  }
  
  // Get birth events for an animal (as dam)
  async getAnimalBirthEvents(animalId, userId, filters = {}) {
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
        query.birthDate = query.birthDate || {};
        query.birthDate.$gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        query.birthDate = query.birthDate || {};
        query.birthDate.$lte = new Date(filters.endDate);
      }
      
      // Only show active by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get birth events with population
      const birthEvents = await BirthEvent.find(query)
        .populate('dam', 'name tagNumber gender breed')
        .populate('sire', 'name tagNumber gender breed')
        .populate('pregnancy')
        .populate('offspring', 'name tagNumber gender status')
        .sort({ birthDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await BirthEvent.countDocuments(query);
      
      // Add virtual fields
      const eventsWithVirtuals = birthEvents.map(event => {
        const eventObj = new BirthEvent(event);
        return {
          ...event,
          successRate: eventObj.successRate,
          stillbirthRate: eventObj.stillbirthRate,
          genderRatio: eventObj.genderRatio,
          survivalRate: eventObj.survivalRate,
        };
      });
      
      return {
        events: eventsWithVirtuals,
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
      console.error('Service error getting animal birth events:', error);
      throw error;
    }
  }
  
  // Get birth event by ID
  async getBirthEventById(eventId, userId) {
    try {
      const birthEvent = await BirthEvent.findById(eventId)
        .populate('dam', 'name tagNumber gender breed animalType')
        .populate('sire', 'name tagNumber gender breed')
        .populate('pregnancy')
        .populate('offspring', 'name tagNumber gender status dateOfBirth')
        .populate('recordedBy', 'firstName lastName');
      
      if (!birthEvent) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: birthEvent.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      // Add virtual fields
      const eventObj = new BirthEvent(birthEvent.toObject());
      const eventWithVirtuals = {
        ...birthEvent.toObject(),
        successRate: eventObj.successRate,
        stillbirthRate: eventObj.stillbirthRate,
        genderRatio: eventObj.genderRatio,
        survivalRate: eventObj.survivalRate,
      };
      
      return eventWithVirtuals;
    } catch (error) {
      console.error('Service error getting birth event:', error);
      throw error;
    }
  }
  
  // Update birth event
  async updateBirthEvent(eventId, userId, updateData) {
    try {
      const birthEvent = await this.getBirthEventById(eventId, userId);
      
      if (!birthEvent) {
        return null;
      }
      
      // Don't allow changing dam, sire, pregnancy, or farm
      if (updateData.dam || updateData.sire || updateData.pregnancy || updateData.farm) {
        throw new Error('Cannot change dam, sire, pregnancy, or farm reference');
      }
      
      // Update birth event
      const updatedEvent = await BirthEvent.findByIdAndUpdate(
        eventId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
      .populate('dam', 'name tagNumber gender breed')
      .populate('sire', 'name tagNumber gender breed')
      .populate('offspring', 'name tagNumber gender');
      
      return updatedEvent;
    } catch (error) {
      console.error('Service error updating birth event:', error);
      throw error;
    }
  }
  
  // Mark birth event as completed
  async markBirthEventCompleted(eventId, userId) {
    try {
      const birthEvent = await BirthEvent.findById(eventId);
      
      if (!birthEvent) {
        return null;
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: birthEvent.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      birthEvent.status = 'completed';
      birthEvent.completionDate = new Date();
      await birthEvent.save();
      
      return birthEvent;
    } catch (error) {
      console.error('Service error marking birth event as completed:', error);
      throw error;
    }
  }
  
  // Record neonatal death
  async recordNeonatalDeath(eventId, userId, deathData) {
    try {
      const birthEvent = await BirthEvent.findById(eventId);
      
      if (!birthEvent) {
        return null;
      }
      
      // Verify user has permission
      const farm = await Farm.findOne({
        _id: birthEvent.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      // Verify offspring exists and belongs to this birth event
      const offspring = await Animal.findById(deathData.offspringId);
      if (!offspring || offspring.birthEvent?.toString() !== eventId) {
        throw new Error('Offspring not found or does not belong to this birth event');
      }
      
      // Add neonatal death record
      if (!birthEvent.neonatalDeaths) {
        birthEvent.neonatalDeaths = [];
      }
      
      birthEvent.neonatalDeaths.push({
        offspringId: deathData.offspringId,
        deathDate: new Date(deathData.deathDate || new Date()),
        cause: deathData.cause,
        notes: deathData.notes,
      });
      
      await birthEvent.save();
      
      // Update offspring status to deceased
      await Animal.findByIdAndUpdate(deathData.offspringId, {
        status: 'deceased',
        dateOfDeath: deathData.deathDate || new Date(),
      });
      
      // Update offspring tracking record
      await OffspringTracking.findOneAndUpdate(
        { offspring: deathData.offspringId },
        {
          status: 'died',
          deathDetails: {
            date: deathData.deathDate || new Date(),
            cause: deathData.cause,
            notes: deathData.notes,
          },
        }
      );
      
      return birthEvent;
    } catch (error) {
      console.error('Service error recording neonatal death:', error);
      throw error;
    }
  }
  
  // Get birth statistics for a farm
  async getBirthStatistics(farmId, userId, period = 'year') {
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
      
      // Get birth events in period
      const birthEvents = await BirthEvent.find({
        farm: farmId,
        birthDate: { $gte: startDate },
        isActive: true,
      })
      .populate('dam', 'name tagNumber breed species')
      .populate('sire', 'name tagNumber breed')
      .populate('offspring', 'name tagNumber gender status')
      .lean();
      
      // Calculate statistics
      const stats = {
        totalBirthEvents: birthEvents.length,
        totalOffspringBorn: 0,
        totalLiveBirths: 0,
        totalStillbirths: 0,
        averageLitterSize: 0,
        survivalRate: 0,
        stillbirthRate: 0,
        bySpecies: {},
        byMonth: {},
        topProducingDams: {},
      };
      
      let totalLitterSize = 0;
      let totalSurvived = 0;
      
      birthEvents.forEach(event => {
        // Count totals
        stats.totalOffspringBorn += event.totalOffspring || 0;
        stats.totalLiveBirths += event.liveBirths || 0;
        stats.totalStillbirths += event.stillbirths || 0;
        totalLitterSize += event.liveBirths || 0;
        
        // Count by species
        const species = event.dam?.species || 'unknown';
        if (!stats.bySpecies[species]) {
          stats.bySpecies[species] = {
            birthEvents: 0,
            offspringBorn: 0,
            liveBirths: 0,
            stillbirths: 0,
          };
        }
        stats.bySpecies[species].birthEvents++;
        stats.bySpecies[species].offspringBorn += event.totalOffspring || 0;
        stats.bySpecies[species].liveBirths += event.liveBirths || 0;
        stats.bySpecies[species].stillbirths += event.stillbirths || 0;
        
        // Count by month
        const month = new Date(event.birthDate).toISOString().slice(0, 7);
        if (!stats.byMonth[month]) {
          stats.byMonth[month] = 0;
        }
        stats.byMonth[month]++;
        
        // Track dam performance
        const damId = event.dam?._id?.toString();
        if (damId) {
          if (!stats.topProducingDams[damId]) {
            stats.topProducingDams[damId] = {
              name: event.dam?.name || 'Unknown',
              tagNumber: event.dam?.tagNumber || 'Unknown',
              species: event.dam?.species || 'Unknown',
              birthEvents: 0,
              totalOffspring: 0,
              liveBirths: 0,
              averageLitterSize: 0,
            };
          }
          stats.topProducingDams[damId].birthEvents++;
          stats.topProducingDams[damId].totalOffspring += event.totalOffspring || 0;
          stats.topProducingDams[damId].liveBirths += event.liveBirths || 0;
          
          // Count surviving offspring
          if (event.offspring) {
            const survived = event.offspring.filter(o => o.status === 'alive').length;
            totalSurvived += survived;
          }
        }
      });
      
      // Calculate averages and rates
      stats.averageLitterSize = birthEvents.length > 0 ?
        totalLitterSize / birthEvents.length : 0;
      
      stats.stillbirthRate = stats.totalOffspringBorn > 0 ?
        (stats.totalStillbirths / stats.totalOffspringBorn) * 100 : 0;
      
      stats.survivalRate = stats.totalLiveBirths > 0 ?
        (totalSurvived / stats.totalLiveBirths) * 100 : 0;
      
      // Calculate averages for top dams
      Object.keys(stats.topProducingDams).forEach(damId => {
        const dam = stats.topProducingDams[damId];
        dam.averageLitterSize = dam.birthEvents > 0 ?
          dam.liveBirths / dam.birthEvents : 0;
      });
      
      // Sort top dams by total offspring
      stats.topProducingDams = Object.values(stats.topProducingDams)
        .sort((a, b) => b.totalOffspring - a.totalOffspring)
        .slice(0, 10);
      
      return stats;
    } catch (error) {
      console.error('Service error getting birth statistics:', error);
      throw error;
    }
  }
}

module.exports = new BirthEventService();