// src/modules/animals/operations/feeds/feedAlerts.service.js
const Feed = require('./feed.model');
const FeedSchedule = require('./feedSchedule.model');
const FeedInventory = require('./feedInventory.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');

const feedAlertsService = {
  // Check for missed feedings
  checkMissedFeedings: async (farmId, userId) => {
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
      
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      
      // Get scheduled feeds for yesterday and today that are not completed
      const missedFeedings = await Feed.find({
        farm: farmId,
        feedingTime: { $gte: yesterdayStart, $lt: now },
        isCompleted: false,
        isMissed: true,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      // Check feed schedules for upcoming feeds
      const activeSchedules = await FeedSchedule.find({
        farm: farmId,
        isActive: true,
      })
      .populate('animal', 'tagNumber name')
      .lean();
      
      const upcomingAlerts = [];
      
      activeSchedules.forEach(schedule => {
        // Convert plain object to Mongoose document to access instance methods
        const scheduleDoc = new FeedSchedule(schedule);
        const nextFeedings = scheduleDoc.generateNextFeedings(1);
        const nextFeeding = nextFeedings[0];
        
        if (nextFeeding && nextFeeding.date <= new Date(now.getTime() + 2 * 60 * 60 * 1000)) { // Within 2 hours
          upcomingAlerts.push({
            type: 'upcoming',
            scheduleId: schedule._id,
            animalId: schedule.animal,
            animalName: schedule.animal?.name,
            animalTag: schedule.animal?.tagNumber,
            feedType: schedule.feedType,
            quantity: schedule.quantity,
            scheduledTime: nextFeeding.date,
            message: `Upcoming feeding for ${schedule.animal?.name || 'Animal'}`,
          });
        }
      });
      
      return {
        missedFeedings,
        upcomingAlerts,
        totalAlerts: missedFeedings.length + upcomingAlerts.length,
        lastChecked: now,
      };
    } catch (error) {
      console.error('Service error checking feed alerts:', error);
      throw error;
    }
  },
  
  // Check low inventory alerts
  checkLowInventoryAlerts: async (farmId, userId) => {
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
      
      // Get inventory items that need reorder
      const lowInventoryItems = await FeedInventory.find({
        farm: farmId,
        needsReorder: true,
        isActive: true,
      }).lean();
      
      // Check for expiring items (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringItems = await FeedInventory.find({
        farm: farmId,
        expirationDate: { $lte: thirtyDaysFromNow, $gte: new Date() },
        isActive: true,
      }).lean();
      
      return {
        lowInventory: lowInventoryItems,
        expiringItems,
        totalInventoryAlerts: lowInventoryItems.length + expiringItems.length,
      };
    } catch (error) {
      console.error('Service error checking inventory alerts:', error);
      throw error;
    }
  },
  
  // Get all feed-related alerts for dashboard
  getAllFeedAlerts: async (farmId, userId) => {
    try {
      const [feedingAlerts, inventoryAlerts] = await Promise.all([
        feedAlertsService.checkMissedFeedings(farmId, userId),
        feedAlertsService.checkLowInventoryAlerts(farmId, userId),
      ]);
      
      return {
        feedingAlerts,
        inventoryAlerts,
        totalAlerts: feedingAlerts.totalAlerts + inventoryAlerts.totalInventoryAlerts,
        summary: {
          missedFeedings: feedingAlerts.missedFeedings.length,
          upcomingFeedings: feedingAlerts.upcomingAlerts.length,
          lowInventoryItems: inventoryAlerts.lowInventory.length,
          expiringItems: inventoryAlerts.expiringItems.length,
        },
      };
    } catch (error) {
      console.error('Service error getting all feed alerts:', error);
      throw error;
    }
  },
  
  // Mark alert as resolved
  markAlertAsResolved: async (alertType, alertId, userId) => {
    try {
      switch (alertType) {
        case 'missed_feeding':
          const feed = await Feed.findById(alertId);
          if (feed) {
            feed.isMissed = false;
            feed.notes = feed.notes ? `${feed.notes} | Alert resolved on ${new Date().toISOString()}` : `Alert resolved on ${new Date().toISOString()}`;
            await feed.save();
          }
          break;
          
        case 'low_inventory':
          const inventory = await FeedInventory.findById(alertId);
          if (inventory) {
            inventory.needsReorder = false;
            await inventory.save();
          }
          break;
          
        default:
          throw new Error('Invalid alert type');
      }
      
      return { success: true, message: 'Alert resolved successfully' };
    } catch (error) {
      console.error('Service error resolving alert:', error);
      throw error;
    }
  },
};

module.exports = feedAlertsService;