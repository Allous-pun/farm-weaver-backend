// src/controllers/farm.controller.js
const farmService = require('../service/farm.service');

// Create a new farm
const createFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, location, themeColor, isDefault } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'Farm name is required',
      });
    }

    const farmData = {
      name,
      description,
      location,
      themeColor,
      isDefault: isDefault || false,
    };

    const farm = await farmService.createFarm(farmData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Farm created successfully',
      data: farm,
    });
  } catch (error) {
    console.error('Error creating farm:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A farm with this name already exists',
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create farm',
    });
  }
};

// Get all farms for the authenticated user
const getFarms = async (req, res) => {
  try {
    const userId = req.userId;
    const includeArchived = req.query.includeArchived === 'true';

    const farms = await farmService.getUserFarms(userId, includeArchived);

    res.status(200).json({
      status: 'success',
      data: farms,
    });
  } catch (error) {
    console.error('Error fetching farms:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch farms',
    });
  }
};

// Get a single farm by ID
const getFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const farm = await farmService.getFarmById(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        status: 'error',
        message: 'Farm not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: farm,
    });
  } catch (error) {
    console.error('Error fetching farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch farm',
    });
  }
};

// Update a farm
const updateFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const updateData = req.body;

    // Don't allow updating user field
    if (updateData.user) {
      delete updateData.user;
    }

    const farm = await farmService.updateFarm(farmId, userId, updateData);

    if (!farm) {
      return res.status(404).json({
        status: 'error',
        message: 'Farm not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Farm updated successfully',
      data: farm,
    });
  } catch (error) {
    console.error('Error updating farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update farm',
    });
  }
};

// Archive a farm (soft delete)
const archiveFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const farm = await farmService.archiveFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        status: 'error',
        message: 'Farm not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Farm archived successfully',
      data: farm,
    });
  } catch (error) {
    console.error('Error archiving farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to archive farm',
    });
  }
};

// Restore an archived farm
const restoreFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const farm = await farmService.restoreFarm(farmId, userId);

    if (!farm) {
      return res.status(404).json({
        status: 'error',
        message: 'Archived farm not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Farm restored successfully',
      data: farm,
    });
  } catch (error) {
    console.error('Error restoring farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore farm',
    });
  }
};

// Delete a farm permanently
const deleteFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    // Check if this is the user's default farm
    const farm = await farmService.getFarmById(farmId, userId);
    if (farm && farm.isDefault) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete default farm',
      });
    }

    const result = await farmService.deleteFarm(farmId, userId);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Farm not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Farm deleted permanently',
    });
  } catch (error) {
    console.error('Error deleting farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete farm',
    });
  }
};

// Get or create default farm
const getDefaultFarm = async (req, res) => {
  try {
    const userId = req.userId;

    const defaultFarm = await farmService.getOrCreateDefaultFarm(userId);

    res.status(200).json({
      status: 'success',
      data: defaultFarm,
    });
  } catch (error) {
    console.error('Error getting default farm:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get default farm',
    });
  }
};

module.exports = {
  createFarm,
  getFarms,
  getFarm,
  updateFarm,
  archiveFarm,
  restoreFarm,
  deleteFarm,
  getDefaultFarm,
};