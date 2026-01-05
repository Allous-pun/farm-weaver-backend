// src/modules/animals/animalRecords/animal.service.js
const Animal = require('./animal.model');
const Farm = require('../../farms/farm.model');
const AnimalType = require('../../animalTypes/animalType.model');

const animalService = {
  // Create a new animal
  createAnimal: async (animalData, userId) => {
    try {
      // Verify farm exists, belongs to user, and is not archived
      const farm = await Farm.findOne({
        _id: animalData.farm,
        user: userId,
        isArchived: false,
      });

      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }

      // Verify animal type exists, belongs to the farm, and is not archived
      const animalType = await AnimalType.findOne({
        _id: animalData.animalType,
        farm: animalData.farm,
        isArchived: false,
      });

      if (!animalType) {
        throw new Error('Animal type not found or does not belong to this farm');
      }

      // Generate tag number if not provided
      if (!animalData.tagNumber) {
        animalData.tagNumber = await Animal.generateTagNumber(animalData.farm);
      }

      // Check if tag number is unique in farm
      const existingTag = await Animal.findOne({
        farm: animalData.farm,
        tagNumber: animalData.tagNumber,
      });

      if (existingTag) {
        throw new Error(`Tag number ${animalData.tagNumber} already exists in this farm`);
      }

      // Set createdBy
      animalData.createdBy = userId;

      // Create animal
      const animal = await Animal.create(animalData);
      
      return animal;
    } catch (error) {
      console.error('Service error creating animal:', error);
      throw error;
    }
  },

  // Get animal by ID with permission check
  getAnimalById: async (animalId, userId) => {
    try {
      const animal = await Animal.findById(animalId);

      if (!animal) {
        return null;
      }

      // Check if farm belongs to user
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });

      if (!farm) {
        return null;
      }

      return animal;
    } catch (error) {
      console.error('Service error getting animal:', error);
      throw error;
    }
  },

  // Get animals by farm
  getAnimalsByFarm: async (farmId, userId, filters = {}) => {
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

      const query = { farm: farmId };

      // Apply filters
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }

      if (filters.gender) {
        query.gender = filters.gender;
      }

      if (filters.status) {
        query.status = filters.status;
      } else {
        query.status = { $ne: 'archived' }; // Exclude archived by default
      }

      if (filters.search) {
        query.$or = [
          { tagNumber: { $regex: filters.search, $options: 'i' } },
          { name: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const animals = await Animal.find(query)
        .sort({ tagNumber: 1 })
        .lean();

      return animals;
    } catch (error) {
      console.error('Service error getting farm animals:', error);
      throw error;
    }
  },

  // Get all animals for user (across all farms)
  getUserAnimals: async (userId, filters = {}) => {
    try {
      // Get all farms owned by user
      const farms = await Farm.find({ user: userId, isArchived: false });
      const farmIds = farms.map(farm => farm._id);

      const query = { farm: { $in: farmIds } };

      // Apply filters
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }

      if (filters.gender) {
        query.gender = filters.gender;
      }

      if (filters.status) {
        query.status = filters.status;
      } else {
        query.status = { $ne: 'archived' }; // Exclude archived by default
      }

      if (filters.search) {
        query.$or = [
          { tagNumber: { $regex: filters.search, $options: 'i' } },
          { name: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const animals = await Animal.find(query)
        .sort({ farm: 1, tagNumber: 1 })
        .lean();

      return animals;
    } catch (error) {
      console.error('Service error getting user animals:', error);
      throw error;
    }
  },

  // Update animal
  updateAnimal: async (animalId, userId, updateData) => {
    try {
      // Get animal with permission check
      const animal = await animalService.getAnimalById(animalId, userId);
      
      if (!animal) {
        return null;
      }

      // Don't allow changing farm or animal type
      if (updateData.farm || updateData.animalType) {
        throw new Error('Cannot change farm or animal type reference');
      }

      // Check tag number uniqueness if being changed
      if (updateData.tagNumber && updateData.tagNumber !== animal.tagNumber) {
        const existingTag = await Animal.findOne({
          farm: animal.farm,
          tagNumber: updateData.tagNumber,
          _id: { $ne: animalId },
        });

        if (existingTag) {
          throw new Error(`Tag number ${updateData.tagNumber} already exists in this farm`);
        }
      }

      // Update animal
      const updatedAnimal = await Animal.findByIdAndUpdate(
        animalId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      return updatedAnimal;
    } catch (error) {
      console.error('Service error updating animal:', error);
      throw error;
    }
  },

  // Update animal status
  updateAnimalStatus: async (animalId, userId, status, reason = '') => {
    try {
      const animal = await animalService.getAnimalById(animalId, userId);
      
      if (!animal) {
        return null;
      }

      animal.status = status;
      animal.statusDate = new Date();
      animal.statusReason = reason;
      
      if (status !== 'alive') {
        animal.isActive = false;
      }
      
      await animal.save();

      return animal;
    } catch (error) {
      console.error('Service error updating animal status:', error);
      throw error;
    }
  },

  // Update animal weight
  updateAnimalWeight: async (animalId, userId, weightValue, unit = 'kg') => {
    try {
      const animal = await animalService.getAnimalById(animalId, userId);
      
      if (!animal) {
        return null;
      }

      animal.weight = {
        value: weightValue,
        unit: unit,
        lastUpdated: new Date(),
      };
      
      await animal.save();

      return animal;
    } catch (error) {
      console.error('Service error updating animal weight:', error);
      throw error;
    }
  },

  // Archive animal (soft delete)
  archiveAnimal: async (animalId, userId) => {
    try {
      const animal = await animalService.getAnimalById(animalId, userId);
      
      if (!animal) {
        return null;
      }

      // Can't archive if animal has active offspring
      if (animal.gender === 'female') {
        const offspringCount = await Animal.countDocuments({
          mother: animalId,
          status: 'alive',
        });

        if (offspringCount > 0) {
          throw new Error('Cannot archive animal with active offspring');
        }
      }

      animal.status = 'archived';
      animal.isActive = false;
      await animal.save();

      return animal;
    } catch (error) {
      console.error('Service error archiving animal:', error);
      throw error;
    }
  },

  // Get animal statistics for dashboard
  getAnimalStatistics: async (farmId, userId) => {
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

      // Get status statistics
      const statusStats = await Animal.aggregate([
        { $match: { farm: farm._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get gender statistics for alive animals
      const genderStats = await Animal.aggregate([
        { $match: { farm: farm._id, status: 'alive' } },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get animal type statistics for alive animals
      const typeStats = await Animal.aggregate([
        { $match: { farm: farm._id, status: 'alive' } },
        {
          $lookup: {
            from: 'animaltypes',
            localField: 'animalType',
            foreignField: '_id',
            as: 'type',
          },
        },
        { $unwind: '$type' },
        {
          $group: {
            _id: '$type.name',
            count: { $sum: 1 },
            icon: { $first: '$type.icon' },
            category: { $first: '$type.category' },
          },
        },
      ]);

      // Calculate totals
      const totalAnimals = await Animal.countDocuments({ farm: farm._id });
      const totalAlive = await Animal.countDocuments({ 
        farm: farm._id, 
        status: 'alive' 
      });

      return {
        byStatus: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byGender: genderStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        byType: typeStats,
        totals: {
          totalAnimals,
          totalAlive,
          totalDeceased: await Animal.countDocuments({ 
            farm: farm._id, 
            status: 'deceased' 
          }),
          totalSold: await Animal.countDocuments({ 
            farm: farm._id, 
            status: 'sold' 
          }),
          totalTransferred: await Animal.countDocuments({ 
            farm: farm._id, 
            status: 'transferred' 
          }),
        },
      };
    } catch (error) {
      console.error('Service error getting animal statistics:', error);
      throw error;
    }
  },
};

module.exports = animalService;