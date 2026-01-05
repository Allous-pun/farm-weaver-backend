// src/modules/animals/operations/feeds/feedSchedule.controller.js
const FeedSchedule = require('./feedSchedule.model');
const FeedScheduleService = require('./feedSchedule.service');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');

// Create a new feed schedule
const createFeedSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const scheduleData = req.body;

    // Validate required fields
    if (!scheduleData.animal || !scheduleData.name || !scheduleData.feedType || 
        !scheduleData.quantity || !scheduleData.quantity.value || !scheduleData.frequency) {
      return res.status(400).json({
        status: 'error',
        message: 'Animal, name, feed type, quantity, and frequency are required',
      });
    }

    // Verify animal exists and belongs to user
    const animal = await Animal.findById(scheduleData.animal);
    
    if (!animal) {
      throw new Error('Animal not found');
    }
    
    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: animal.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      throw new Error('Farm not found or you do not have permission');
    }
    
    // Verify animal type has feed management enabled
    const animalType = await AnimalType.findById(animal.animalType);
    
    if (!animalType || !animalType.features?.feedManagement) {
      throw new Error('Feed management is not enabled for this animal type');
    }

    // Add metadata
    scheduleData.createdBy = userId;
    scheduleData.farm = animal.farm;

    // Create schedule
    const schedule = await FeedSchedule.create(scheduleData);

    res.status(201).json({
      status: 'success',
      message: 'Feed schedule created successfully',
      data: schedule,
    });
  } catch (error) {
    console.error('Error creating feed schedule:', error);
    
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message.includes('not enabled')) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create feed schedule',
    });
  }
};

// Get feed schedules for an animal
const getAnimalFeedSchedules = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const onlyActive = req.query.active !== 'false';

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

    const query = { animal: animalId };
    if (onlyActive) {
      query.isActive = true;
    }

    const schedules = await FeedSchedule.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Generate upcoming feedings for each schedule
    const schedulesWithUpcoming = schedules.map(schedule => {
      const scheduleObj = new FeedSchedule(schedule);
      return {
        ...schedule,
        upcomingFeedings: scheduleObj.generateNextFeedings(3), // Next 3 feedings
      };
    });

    res.status(200).json({
      status: 'success',
      data: schedulesWithUpcoming,
    });
  } catch (error) {
    console.error('Error fetching animal feed schedules:', error);
    
    if (error.message === 'Animal not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feed schedules',
    });
  }
};

// Get feed schedules for a farm
const getFarmFeedSchedules = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const onlyActive = req.query.active !== 'false';

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
    if (onlyActive) {
      query.isActive = true;
    }

    const schedules = await FeedSchedule.find(query)
      .populate('animal', 'tagNumber name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: schedules,
    });
  } catch (error) {
    console.error('Error fetching farm feed schedules:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feed schedules',
    });
  }
};

// Update feed schedule
const updateFeedSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { scheduleId } = req.params;
    const updateData = req.body;

    // Get schedule and verify permission
    const schedule = await FeedSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed schedule not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: schedule.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Don't allow changing animal or farm
    if (updateData.animal || updateData.farm) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change animal or farm reference',
      });
    }

    const updatedSchedule = await FeedSchedule.findByIdAndUpdate(
      scheduleId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
      message: 'Feed schedule updated successfully',
      data: updatedSchedule,
    });
  } catch (error) {
    console.error('Error updating feed schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update feed schedule',
    });
  }
};

// Delete feed schedule
const deleteFeedSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { scheduleId } = req.params;

    // Get schedule and verify permission
    const schedule = await FeedSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed schedule not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: schedule.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    await FeedSchedule.findByIdAndDelete(scheduleId);

    res.status(200).json({
      status: 'success',
      message: 'Feed schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feed schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete feed schedule',
    });
  }
};

// Generate feed records from schedule
const generateFeedFromSchedule = async (req, res) => {
  try {
    const userId = req.userId;
    const { scheduleId } = req.params;
    const { count = 7 } = req.body; // Generate next X days of feeds

    // Get schedule and verify permission
    const schedule = await FeedSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed schedule not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: schedule.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Generate feed records from schedule
    const scheduleObj = new FeedSchedule(schedule);
    const upcomingFeedings = scheduleObj.generateNextFeedings(parseInt(count));
    
    const generatedFeeds = [];
    const now = new Date();

    for (const feeding of upcomingFeedings) {
      if (feeding.date > now) {
        const feedRecord = {
          animal: schedule.animal,
          feedType: schedule.feedType,
          customFeedName: schedule.customFeedName,
          quantity: schedule.quantity,
          feedingTime: feeding.date,
          scheduleType: 'scheduled',
          cost: schedule.estimatedCostPerFeeding,
          notes: `Generated from schedule: ${schedule.name}`,
          isCompleted: false,
          isMissed: false,
          recordedBy: userId,
          farm: schedule.farm,
        };

        generatedFeeds.push(feedRecord);
      }
    }

    // Update last generated date
    schedule.lastGenerated = new Date();
    await schedule.save();

    res.status(200).json({
      status: 'success',
      message: `${generatedFeeds.length} feed records generated from schedule`,
      data: {
        scheduleId: schedule._id,
        scheduleName: schedule.name,
        generatedCount: generatedFeeds.length,
        feedTemplates: generatedFeeds,
        lastGenerated: schedule.lastGenerated,
      },
    });
  } catch (error) {
    console.error('Error generating feed from schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate feed from schedule',
    });
  }
};

module.exports = {
  createFeedSchedule,
  getAnimalFeedSchedules,
  getFarmFeedSchedules,
  updateFeedSchedule,
  deleteFeedSchedule,
  generateFeedFromSchedule,
};