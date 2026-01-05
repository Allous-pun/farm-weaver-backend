// src/modules/animals/operations/feeds/feedCostAnalytics.controller.js
const feedService = require('./feed.service');

// Get feed cost analytics for an animal
const getAnimalFeedCostAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    const period = req.query.period || 'month';

    const analytics = await feedService.getAnimalFeedCostAnalytics(animalId, userId, period);

    res.status(200).json({
      status: 'success',
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching feed cost analytics:', error);
    
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
      message: 'Failed to fetch feed cost analytics',
    });
  }
};

// Get farm-wide feed cost analytics
const getFarmFeedCostAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const period = req.query.period || 'month';

    const analytics = await feedService.getFarmFeedCostAnalytics(farmId, userId, period);

    res.status(200).json({
      status: 'success',
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching farm feed cost analytics:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch farm feed cost analytics',
    });
  }
};

module.exports = {
  getAnimalFeedCostAnalytics,
  getFarmFeedCostAnalytics,
};