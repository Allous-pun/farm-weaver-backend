// src/service/farm.service.js
const Farm = require('../modules/farms/farm.model');

const farmService = {
  // Create a new farm
  createFarm: async (farmData, userId) => {
    // If this farm is default, unset other default farms first
    if (farmData.isDefault) {
      await Farm.updateMany(
        {
          user: userId,
          isDefault: true,
        },
        { isDefault: false }
      );
    }
    
    const farm = await Farm.create({
      ...farmData,
      user: userId,
    });
    return farm;
  },

  // Get all farms for a user
  getUserFarms: async (userId, includeArchived = false) => {
    const query = { user: userId };
    
    if (!includeArchived) {
      query.isArchived = false;
    }

    const farms = await Farm.find(query)
      .sort({ isDefault: -1, createdAt: -1 }) // Default farms first
      .lean();
    
    return farms;
  },

  // Get farm by ID (with user check)
  getFarmById: async (farmId, userId) => {
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
    });
    return farm;
  },

  // Update farm
  updateFarm: async (farmId, userId, updateData) => {
    // If setting isDefault to true, unset other default farms first
    if (updateData.isDefault === true) {
      await Farm.updateMany(
        {
          user: userId,
          _id: { $ne: farmId },
          isDefault: true,
        },
        { isDefault: false }
      );
    }

    const farm = await Farm.findOneAndUpdate(
      {
        _id: farmId,
        user: userId,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    return farm;
  },

  // Archive farm (soft delete)
  archiveFarm: async (farmId, userId) => {
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
    });

    if (!farm) {
      return null;
    }

    // If archiving default farm, set another farm as default
    if (farm.isDefault) {
      // Find another active farm to make default
      const anotherFarm = await Farm.findOne({
        user: userId,
        _id: { $ne: farmId },
        isArchived: false,
      });
      
      if (anotherFarm) {
        anotherFarm.isDefault = true;
        await anotherFarm.save();
      }
    }

    await farm.archive();
    return farm;
  },

  // Restore archived farm
  restoreFarm: async (farmId, userId) => {
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
      isArchived: true,
    });

    if (!farm) {
      return null;
    }

    await farm.restore();
    return farm;
  },

  // Delete farm permanently (hard delete)
  deleteFarm: async (farmId, userId) => {
    const result = await Farm.findOneAndDelete({
      _id: farmId,
      user: userId,
    });
    return result;
  },

  // Get or create default farm for user
  getOrCreateDefaultFarm: async (userId) => {
    // Try to get existing default farm
    let defaultFarm = await Farm.findOne({
      user: userId,
      isDefault: true,
      isArchived: false,
    });

    // If no default farm exists, create one
    if (!defaultFarm) {
      defaultFarm = await Farm.create({
        name: 'My Farm',
        description: 'Default farm',
        isDefault: true,
        user: userId,
      });
    }

    return defaultFarm;
  },

  // Check if user has any farms
  hasFarms: async (userId) => {
    const count = await Farm.countDocuments({
      user: userId,
      isArchived: false,
    });
    return count > 0;
  },
};

module.exports = farmService;