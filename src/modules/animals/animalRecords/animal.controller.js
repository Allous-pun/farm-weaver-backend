// src/modules/animals/animalRecords/animal.controller.js
const animalService = require('./animal.service');
const Animal = require('./animal.model');

// Create a new animal
const createAnimal = async (req, res) => {
  try {
    const userId = req.userId;
    const animalData = req.body;

    // Validate required fields
    if (!animalData.tagNumber || !animalData.gender || !animalData.dateOfBirth || 
        !animalData.animalType || !animalData.farm) {
      return res.status(400).json({
        status: 'error',
        message: 'Tag number, gender, date of birth, animal type, and farm are required',
      });
    }

    const animal = await animalService.createAnimal(animalData, userId);

    // If you need populated data, load it here before returning
    const populatedAnimal = await Animal.findById(animal._id)
      .populate('animalType', 'name category icon')
      .populate('farm', 'name')
      .lean();

    res.status(201).json({
      status: 'success',
      message: 'Animal created successfully',
      data: populatedAnimal,
    });
  } catch (error) {
    console.error('Error creating animal:', error);
    
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create animal',
    });
  }
};

// Get animal by ID
const getAnimal = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;

    const animal = await animalService.getAnimalById(animalId, userId);

    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: animal,
    });
  } catch (error) {
    console.error('Error fetching animal:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animal',
    });
  }
};

// Get animals by farm
const getAnimalsByFarm = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    
    const filters = {
      animalType: req.query.animalType,
      gender: req.query.gender,
      status: req.query.status,
      search: req.query.search,
    };

    const animals = await animalService.getAnimalsByFarm(farmId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: animals,
    });
  } catch (error) {
    console.error('Error fetching farm animals:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animals',
    });
  }
};

// Get all animals for user
const getUserAnimals = async (req, res) => {
  try {
    const userId = req.userId;
    
    const filters = {
      animalType: req.query.animalType,
      gender: req.query.gender,
      status: req.query.status,
      search: req.query.search,
    };

    const animals = await animalService.getUserAnimals(userId, filters);

    res.status(200).json({
      status: 'success',
      data: animals,
    });
  } catch (error) {
    console.error('Error fetching user animals:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animals',
    });
  }
};

// Update animal
const updateAnimal = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const updateData = req.body;

    const animal = await animalService.updateAnimal(animalId, userId, updateData);

    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal updated successfully',
      data: animal,
    });
  } catch (error) {
    console.error('Error updating animal:', error);
    
    if (error.message === 'Cannot change farm or animal type reference') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update animal',
    });
  }
};

// Update animal status
const updateAnimalStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required',
      });
    }

    const animal = await animalService.updateAnimalStatus(animalId, userId, status, reason);

    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal status updated successfully',
      data: animal,
    });
  } catch (error) {
    console.error('Error updating animal status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update animal status',
    });
  }
};

// Update animal weight
const updateAnimalWeight = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const { weight, unit } = req.body;

    if (!weight) {
      return res.status(400).json({
        status: 'error',
        message: 'Weight is required',
      });
    }

    const animal = await animalService.updateAnimalWeight(animalId, userId, weight, unit);

    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal weight updated successfully',
      data: animal,
    });
  } catch (error) {
    console.error('Error updating animal weight:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update animal weight',
    });
  }
};

// Archive animal
const archiveAnimal = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;

    const animal = await animalService.archiveAnimal(animalId, userId);

    if (!animal) {
      return res.status(404).json({
        status: 'error',
        message: 'Animal not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Animal archived successfully',
      data: animal,
    });
  } catch (error) {
    console.error('Error archiving animal:', error);
    
    if (error.message === 'Cannot archive animal with active offspring') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to archive animal',
    });
  }
};

// Get animal statistics
const getAnimalStatistics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const statistics = await animalService.getAnimalStatistics(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching animal statistics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch animal statistics',
    });
  }
};

module.exports = {
  createAnimal,
  getAnimal,
  getAnimalsByFarm,
  getUserAnimals,
  updateAnimal,
  updateAnimalStatus,
  updateAnimalWeight,
  archiveAnimal,
  getAnimalStatistics,
};