// src/modules/animals/operations/feeds/feedAlerts.controller.js
const feedAlertsService = require('./feedAlerts.service');

// Get all feed alerts for a farm
const getFeedAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await feedAlertsService.getAllFeedAlerts(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching feed alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feed alerts',
    });
  }
};

// Get missed feedings alerts
const getMissedFeedingsAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await feedAlertsService.checkMissedFeedings(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching missed feedings alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch missed feedings alerts',
    });
  }
};

// Get inventory alerts
const getInventoryAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    const alerts = await feedAlertsService.checkLowInventoryAlerts(farmId, userId);

    res.status(200).json({
      status: 'success',
      data: alerts,
    });
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory alerts',
    });
  }
};

// Mark alert as resolved
const markAlertAsResolved = async (req, res) => {
  try {
    const userId = req.userId;
    const { alertType, alertId } = req.params;

    if (!['missed_feeding', 'low_inventory'].includes(alertType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid alert type. Must be "missed_feeding" or "low_inventory"',
      });
    }

    const result = await feedAlertsService.markAlertAsResolved(alertType, alertId, userId);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error marking alert as resolved:', error);
    
    if (error.message === 'Invalid alert type') {
      return res.status(400).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to mark alert as resolved',
    });
  }
};

module.exports = {
  getFeedAlerts,
  getMissedFeedingsAlerts,
  getInventoryAlerts,
  markAlertAsResolved,
};