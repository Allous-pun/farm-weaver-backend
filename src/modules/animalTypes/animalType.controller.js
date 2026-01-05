// src/modules/animalTypes/animalType.controller.js
const animalTypeService = require('./animalType.service');

// Create a new animal type
const createAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const animalTypeData = req.body;

    // Validate required fields
    if (!animalTypeData.name || !animalTypeData.farm) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and farm are required',
      });
    }

    const animalType = await animalTypeService.createAnimalType(animalTypeData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Animal type created successfully',
      data: animalType,
    });
  } catch (error) {
    console.error('Error creating animal type:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'An animal type with this name already exists in this farm') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create animal type',
    });
  }
};

// Get all animal types for the authenticated user
const getAnimalTypes = async (req, res) => {
  try {
    const userId = req.userId;
    const includeArchived = req.query.includeArchived === 'true';
    const farmId = req.query.farmId;

    let animalTypes;

    if (farmId) {
      // Get animal types for specific farm
      animalTypes = await animalTypeService.getAnimalTypesByFarm(farmId, userId, includeArchived);
    } else {
      // Get all animal types for user (across all farms)
      animalTypes = await animalTypeService.getUserAnimalTypes(userId, includeArchived);
    }

    res.status(200).json({
      status: 'success',
      data: animalTypes,
    });
  } catch (error) {
    console.error('Error fetching animal types:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animal types',
    });
  }
};

// Get a single animal type by ID
const getAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalTypeId } = req.params;

    const animalType = await animalTypeService.getAnimalTypeById(animalTypeId, userId);

    if (!animalType) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: animalType,
    });
  } catch (error) {
    console.error('Error fetching animal type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animal type',
    });
  }
};

// Update an animal type
const updateAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalTypeId } = req.params;
    const updateData = req.body;

    // If name is being updated, check uniqueness
    if (updateData.name) {
      // Get current animal type to know the farm
      const currentAnimalType = await animalTypeService.getAnimalTypeById(animalTypeId, userId);
      
      if (!currentAnimalType) {
        return res.status(404).json({
          status: 'error',
          message: 'Animal type not found',
        });
      }

      const isUnique = await animalTypeService.isNameUniqueInFarm(
        updateData.name,
        currentAnimalType.farm,
        animalTypeId
      );

      if (!isUnique) {
        return res.status(400).json({
          status: 'error',
          message: 'An animal type with this name already exists in this farm',
        });
      }
    }

    const animalType = await animalTypeService.updateAnimalType(animalTypeId, userId, updateData);

    if (!animalType) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal type updated successfully',
      data: animalType,
    });
  } catch (error) {
    console.error('Error updating animal type:', error);
    
    if (error.message === 'Cannot change farm reference') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update animal type',
    });
  }
};

// Archive an animal type (soft delete)
const archiveAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalTypeId } = req.params;

    const animalType = await animalTypeService.archiveAnimalType(animalTypeId, userId);

    if (!animalType) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal type archived successfully',
      data: animalType,
    });
  } catch (error) {
    console.error('Error archiving animal type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to archive animal type',
    });
  }
};

// Restore an archived animal type
const restoreAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalTypeId } = req.params;

    const animalType = await animalTypeService.restoreAnimalType(animalTypeId, userId);

    if (!animalType) {
      return res.status(404).json({
        status: 'error',
        message: 'Archived animal type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal type restored successfully',
      data: animalType,
    });
  } catch (error) {
    console.error('Error restoring animal type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restore animal type',
    });
  }
};

// Delete an animal type permanently
const deleteAnimalType = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalTypeId } = req.params;

    const result = await animalTypeService.deleteAnimalType(animalTypeId, userId);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal type not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal type deleted permanently',
    });
  } catch (error) {
    console.error('Error deleting animal type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete animal type',
    });
  }
};

module.exports = {
  createAnimalType,
  getAnimalTypes,
  getAnimalType,
  updateAnimalType,
  archiveAnimalType,
  restoreAnimalType,
  deleteAnimalType,
};