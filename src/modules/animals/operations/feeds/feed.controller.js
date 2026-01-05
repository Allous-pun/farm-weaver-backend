// src/modules/animals/operations/feeds/feed.controller.js
const feedService = require('./feed.service');

// Create a new feed record
const createFeedRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const feedData = req.body;

    // Validate required fields
    if (!feedData.animal || !feedData.quantity || !feedData.quantity.value) {
      return res.status(400).json({
        status: 'error',
        message: 'Animal and quantity are required',
      });
    }

    const feedRecord = await feedService.createFeedRecord(feedData, userId);

    res.status(201).json({
      status: 'success',
      message: 'Feed record created successfully',
      data: feedRecord,
    });
  } catch (error) {
    console.error('Error creating feed record:', error);
    
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
      message: 'Failed to create feed record',
    });
  }
};

// Get feed records for an animal
const getAnimalFeedRecords = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    
    const filters = {
      feedType: req.query.feedType,
      scheduleType: req.query.scheduleType,
      isCompleted: req.query.isCompleted,
      isMissed: req.query.isMissed,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await feedService.getFeedRecordsByAnimal(animalId, userId, filters);

    res.status(200).json({
      status: 'success',
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching animal feed records:', error);
    
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
      message: 'Failed to fetch feed records',
    });
  }
};

// Get feed summary for an animal
const getAnimalFeedSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const days = parseInt(req.query.days) || 7;

    const result = await feedService.getAnimalFeedSummary(animalId, userId, days);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error fetching animal feed summary:', error);
    
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
      message: 'Failed to fetch feed summary',
    });
  }
};

// Get today's feeds for an animal
const getTodaysFeedsForAnimal = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;

    const todaysFeeds = await feedService.getTodaysFeedsForAnimal(animalId, userId);

    res.status(200).json({
      status: 'success',
      data: todaysFeeds,
    });
  } catch (error) {
    console.error('Error fetching today\'s feeds:', error);
    
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
      message: 'Failed to fetch today\'s feeds',
    });
  }
};

// Get feed record by ID
const getFeedRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { feedId } = req.params;

    const feedRecord = await feedService.getFeedRecordById(feedId, userId);

    if (!feedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: feedRecord,
    });
  } catch (error) {
    console.error('Error fetching feed record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feed record',
    });
  }
};

// Update feed record
const updateFeedRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { feedId } = req.params;
    const updateData = req.body;

    const feedRecord = await feedService.updateFeedRecord(feedId, userId, updateData);

    if (!feedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Feed record updated successfully',
      data: feedRecord,
    });
  } catch (error) {
    console.error('Error updating feed record:', error);
    
    if (error.message === 'Cannot change animal or farm reference') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update feed record',
    });
  }
};

// Delete feed record
const deleteFeedRecord = async (req, res) => {
  try {
    const userId = req.userId;
    const { feedId } = req.params;

    const result = await feedService.deleteFeedRecord(feedId, userId);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Feed record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting feed record:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete feed record',
    });
  }
};

// Mark feed as completed
const markFeedAsCompleted = async (req, res) => {
  try {
    const userId = req.userId;
    const { feedId } = req.params;

    const feedRecord = await feedService.markFeedAsCompleted(feedId, userId);

    if (!feedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Feed marked as completed',
      data: feedRecord,
    });
  } catch (error) {
    console.error('Error marking feed as completed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark feed as completed',
    });
  }
};

// Mark feed as missed
const markFeedAsMissed = async (req, res) => {
  try {
    const userId = req.userId;
    const { feedId } = req.params;

    const feedRecord = await feedService.markFeedAsMissed(feedId, userId);

    if (!feedRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Feed record not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Feed marked as missed',
      data: feedRecord,
    });
  } catch (error) {
    console.error('Error marking feed as missed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark feed as missed',
    });
  }
};

module.exports = {
  createFeedRecord,
  getAnimalFeedRecords,
  getAnimalFeedSummary,
  getTodaysFeedsForAnimal,
  getFeedRecord,
  updateFeedRecord,
  deleteFeedRecord,
  markFeedAsCompleted,
  markFeedAsMissed,
};