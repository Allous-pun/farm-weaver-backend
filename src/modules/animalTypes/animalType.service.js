// src/modules/animalTypes/animalType.service.js
const AnimalType = require('./animalType.model');
const Farm = require('../farms/farm.model');

const animalTypeService = {
  // Create a new animal type
  createAnimalType: async (animalTypeData, userId) => {
    // First, verify that the farm exists and belongs to the user
    const farm = await Farm.findOne({
      _id: animalTypeData.farm,
      user: userId,
      isArchived: false,
    });

    if (!farm) {
      throw new Error('Farm not found or you do not have permission');
    }

    // Check if name is unique in the farm
    const isUnique = await animalTypeService.isNameUniqueInFarm(
      animalTypeData.name,
      animalTypeData.farm
    );

    if (!isUnique) {
      throw new Error('An animal type with this name already exists in this farm');
    }

    // Set default youngName if not provided
    if (!animalTypeData.youngName && animalTypeData.name) {
      animalTypeData.youngName = `${animalTypeData.name} Young`;
    }

    const animalType = await AnimalType.create(animalTypeData);
    return animalType;
  },

  // Get all animal types for a user (via farms)
  getUserAnimalTypes: async (userId, includeArchived = false) => {
    // First, get all farms owned by the user
    const farms = await Farm.find({ user: userId, isArchived: false });
    const farmIds = farms.map(farm => farm._id);

    const query = { farm: { $in: farmIds } };
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    const animalTypes = await AnimalType.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    return animalTypes;
  },

  // Get animal types by farm ID (with user permission check)
  getAnimalTypesByFarm: async (farmId, userId, includeArchived = false) => {
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
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    const animalTypes = await AnimalType.find(query)
      .sort({ name: 1 })
      .lean();
    
    return animalTypes;
  },

  // Get animal type by ID (with user permission check)
  getAnimalTypeById: async (animalTypeId, userId) => {
    const animalType = await AnimalType.findById(animalTypeId);
    
    if (!animalType) {
      return null;
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: animalType.farm,
      user: userId,
      isArchived: false,
    });

    if (!farm) {
      return null;
    }

    return animalType;
  },

  // Update animal type
  updateAnimalType: async (animalTypeId, userId, updateData) => {
    // Get animal type first
    const animalType = await AnimalType.findById(animalTypeId);
    
    if (!animalType) {
      return null;
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: animalType.farm,
      user: userId,
      isArchived: false,
    });

    if (!farm) {
      return null;
    }

    // Don't allow updating farm reference
    if (updateData.farm && updateData.farm.toString() !== animalType.farm.toString()) {
      throw new Error('Cannot change farm reference');
    }

    // If name is being updated, check uniqueness
    if (updateData.name && updateData.name !== animalType.name) {
      const isUnique = await animalTypeService.isNameUniqueInFarm(
        updateData.name,
        animalType.farm,
        animalTypeId
      );

      if (!isUnique) {
        throw new Error('An animal type with this name already exists in this farm');
      }
    }

    // Update the animal type
    const updatedAnimalType = await AnimalType.findByIdAndUpdate(
      animalTypeId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    return updatedAnimalType;
  },

  // Archive animal type (soft delete)
  archiveAnimalType: async (animalTypeId, userId) => {
    const animalType = await animalTypeService.getAnimalTypeById(animalTypeId, userId);
    
    if (!animalType) {
      return null;
    }

    animalType.isArchived = true;
    animalType.isActive = false;
    await animalType.save();
    
    return animalType;
  },

  // Restore archived animal type
  restoreAnimalType: async (animalTypeId, userId) => {
    const animalType = await AnimalType.findOne({
      _id: animalTypeId,
      isArchived: true,
    });

    if (!animalType) {
      return null;
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: animalType.farm,
      user: userId,
      isArchived: false,
    });

    if (!farm) {
      return null;
    }

    animalType.isArchived = false;
    animalType.isActive = true;
    await animalType.save();
    
    return animalType;
  },

  // Delete animal type permanently
  deleteAnimalType: async (animalTypeId, userId) => {
    const animalType = await animalTypeService.getAnimalTypeById(animalTypeId, userId);
    
    if (!animalType) {
      return null;
    }

    const result = await AnimalType.findByIdAndDelete(animalTypeId);
    return result;
  },

  // Check if animal type name is unique within a farm
  isNameUniqueInFarm: async (name, farmId, excludeId = null) => {
    try {
      const query = {
        name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive exact match
        farm: farmId,
        isArchived: false,
      };

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await AnimalType.findOne(query);
      return !existing;
    } catch (error) {
      console.error('Error checking name uniqueness:', error);
      throw error;
    }
  },
};

module.exports = animalTypeService;