// src/modules/animals/operations/feeds/feed.service.js
const Feed = require('./feed.model');
const Animal = require('../../animalRecords/animal.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const Farm = require('../../../farms/farm.model');

const feedService = {
  // Create a new feed record
  createFeedRecord: async (feedData, userId) => {
    try {
      // Verify animal exists
      const animal = await Animal.findById(feedData.animal);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      // Verify farm belongs to user and is not archived
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
      
      // Verify farm matches
      if (feedData.farm && feedData.farm.toString() !== animal.farm.toString()) {
        throw new Error('Farm does not match animal farm');
      }
      
      // Add metadata
      feedData.recordedBy = userId;
      feedData.farm = animal.farm;
      
      // Create feed record
      const feedRecord = await Feed.create(feedData);
      
      return feedRecord;
    } catch (error) {
      console.error('Service error creating feed record:', error);
      throw error;
    }
  },
  
  // Get feed records for an animal (individual animal focus)
  getFeedRecordsByAnimal: async (animalId, userId, filters = {}) => {
    try {
      // First verify animal exists and user has permission
      const animal = await Animal.findById(animalId);
      
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
      
      // Build query
      const query = { animal: animalId };
      
      // Apply filters
      if (filters.feedType) {
        query.feedType = filters.feedType;
      }
      
      if (filters.scheduleType) {
        query.scheduleType = filters.scheduleType;
      }
      
      if (filters.isCompleted !== undefined) {
        query.isCompleted = filters.isCompleted === 'true';
      }
      
      if (filters.isMissed !== undefined) {
        query.isMissed = filters.isMissed === 'true';
      }
      
      // Date filters
      if (filters.startDate) {
        query.feedingTime = query.feedingTime || {};
        query.feedingTime.$gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        query.feedingTime = query.feedingTime || {};
        query.feedingTime.$lte = new Date(filters.endDate);
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get feed records
      const feedRecords = await Feed.find(query)
        .sort({ feedingTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count for pagination
      const totalRecords = await Feed.countDocuments(query);
      
      return {
        records: feedRecords,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          hasNextPage: page * limit < totalRecords,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Service error getting feed records:', error);
      throw error;
    }
  },
  
  // Get feed record by ID
  getFeedRecordById: async (feedId, userId) => {
    try {
      const feedRecord = await Feed.findById(feedId);
      
      if (!feedRecord) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: feedRecord.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      return feedRecord;
    } catch (error) {
      console.error('Service error getting feed record:', error);
      throw error;
    }
  },
  
  // Update feed record
  updateFeedRecord: async (feedId, userId, updateData) => {
    try {
      // Get feed record with permission check
      const feedRecord = await feedService.getFeedRecordById(feedId, userId);
      
      if (!feedRecord) {
        return null;
      }
      
      // Don't allow changing animal or farm
      if (updateData.animal || updateData.farm) {
        throw new Error('Cannot change animal or farm reference');
      }
      
      // Update feed record
      const updatedFeed = await Feed.findByIdAndUpdate(
        feedId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      
      return updatedFeed;
    } catch (error) {
      console.error('Service error updating feed record:', error);
      throw error;
    }
  },
  
  // Delete feed record
  deleteFeedRecord: async (feedId, userId) => {
    try {
      const feedRecord = await feedService.getFeedRecordById(feedId, userId);
      
      if (!feedRecord) {
        return null;
      }
      
      const result = await Feed.findByIdAndDelete(feedId);
      return result;
    } catch (error) {
      console.error('Service error deleting feed record:', error);
      throw error;
    }
  },
  
  // Get feed summary for an animal (recent feeds)
  getAnimalFeedSummary: async (animalId, userId, days = 7) => {
    try {
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
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get recent feeds
      const recentFeeds = await Feed.find({
        animal: animalId,
        feedingTime: { $gte: startDate, $lte: endDate },
      })
      .sort({ feedingTime: -1 })
      .limit(10)
      .lean();
      
      // Calculate totals
      const totals = recentFeeds.reduce((acc, feed) => {
        // Convert all to kg for consistency
        let quantityInKg = feed.quantity.value;
        if (feed.quantity.unit === 'g') quantityInKg = feed.quantity.value / 1000;
        if (feed.quantity.unit === 'lb') quantityInKg = feed.quantity.value * 0.453592;
        if (feed.quantity.unit === 'oz') quantityInKg = feed.quantity.value * 0.0283495;
        
        acc.totalQuantity += quantityInKg;
        acc.totalFeedings++;
        
        // Count by feed type
        if (!acc.byFeedType[feed.feedType]) {
          acc.byFeedType[feed.feedType] = 0;
        }
        acc.byFeedType[feed.feedType] += quantityInKg;
        
        return acc;
      }, {
        totalQuantity: 0,
        totalFeedings: 0,
        byFeedType: {},
        averagePerDay: 0,
      });
      
      // Calculate average per day
      totals.averagePerDay = days > 0 ? totals.totalQuantity / days : 0;
      
      return {
        summary: totals,
        recentFeeds,
      };
    } catch (error) {
      console.error('Service error getting feed summary:', error);
      throw error;
    }
  },
  
  // Mark feed as completed
  markFeedAsCompleted: async (feedId, userId) => {
    try {
      const feedRecord = await feedService.getFeedRecordById(feedId, userId);
      
      if (!feedRecord) {
        return null;
      }
      
      feedRecord.isCompleted = true;
      feedRecord.isMissed = false;
      await feedRecord.save();
      
      return feedRecord;
    } catch (error) {
      console.error('Service error marking feed as completed:', error);
      throw error;
    }
  },
  
  // Mark feed as missed
  markFeedAsMissed: async (feedId, userId) => {
    try {
      const feedRecord = await feedService.getFeedRecordById(feedId, userId);
      
      if (!feedRecord) {
        return null;
      }
      
      feedRecord.isCompleted = false;
      feedRecord.isMissed = true;
      await feedRecord.save();
      
      return feedRecord;
    } catch (error) {
      console.error('Service error marking feed as missed:', error);
      throw error;
    }
  },
  
  // Get today's feeds for an animal
  getTodaysFeedsForAnimal: async (animalId, userId) => {
    try {
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
      
      // Get today's date boundaries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get today's feeds
      const todaysFeeds = await Feed.find({
        animal: animalId,
        feedingTime: {
          $gte: today,
          $lt: tomorrow,
        },
      })
      .sort({ feedingTime: 1 })
      .lean();
      
      return todaysFeeds;
    } catch (error) {
      console.error('Service error getting today\'s feeds:', error);
      throw error;
    }
  },

  // Get feed cost analytics for an animal
  getAnimalFeedCostAnalytics: async (animalId, userId, period = 'month') => {
    try {
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
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'quarter':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'year':
          startDate = new Date(now.setDate(now.getDate() - 365));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }
      
      // Get feed records with cost
      const feedRecords = await Feed.find({
        animal: animalId,
        feedingTime: { $gte: startDate },
        'cost.amount': { $exists: true, $gt: 0 },
      }).lean();
      
      // Calculate cost analytics
      const analytics = {
        totalCost: 0,
        totalQuantity: 0,
        costPerKg: 0,
        dailyAverageCost: 0,
        byFeedType: {},
        costTrend: [],
      };
      
      // Calculate totals
      feedRecords.forEach(record => {
        if (record.cost?.amount) {
          analytics.totalCost += record.cost.amount;
          
          // Convert quantity to kg for consistency
          let quantityInKg = record.quantity.value;
          if (record.quantity.unit === 'g') quantityInKg = record.quantity.value / 1000;
          if (record.quantity.unit === 'lb') quantityInKg = record.quantity.value * 0.453592;
          if (record.quantity.unit === 'oz') quantityInKg = record.quantity.value * 0.0283495;
          
          analytics.totalQuantity += quantityInKg;
          
          // Cost by feed type
          if (!analytics.byFeedType[record.feedType]) {
            analytics.byFeedType[record.feedType] = {
              totalCost: 0,
              totalQuantity: 0,
              costPerKg: 0,
            };
          }
          analytics.byFeedType[record.feedType].totalCost += record.cost.amount;
          analytics.byFeedType[record.feedType].totalQuantity += quantityInKg;
          
          // Cost trend by week
          const weekNumber = Math.floor((new Date() - new Date(record.feedingTime)) / (7 * 24 * 60 * 60 * 1000));
          if (!analytics.costTrend[weekNumber]) {
            analytics.costTrend[weekNumber] = {
              week: weekNumber,
              totalCost: 0,
              totalQuantity: 0,
            };
          }
          analytics.costTrend[weekNumber].totalCost += record.cost.amount;
          analytics.costTrend[weekNumber].totalQuantity += quantityInKg;
        }
      });
      
      // Calculate derived metrics
      analytics.costPerKg = analytics.totalQuantity > 0 ? analytics.totalCost / analytics.totalQuantity : 0;
      
      const daysInPeriod = Math.max(1, Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24)));
      analytics.dailyAverageCost = analytics.totalCost / daysInPeriod;
      
      // Calculate cost per kg for each feed type
      Object.keys(analytics.byFeedType).forEach(feedType => {
        const typeData = analytics.byFeedType[feedType];
        typeData.costPerKg = typeData.totalQuantity > 0 ? typeData.totalCost / typeData.totalQuantity : 0;
      });
      
      // Sort cost trend
      analytics.costTrend = analytics.costTrend.filter(Boolean).sort((a, b) => a.week - b.week);
      
      return analytics;
    } catch (error) {
      console.error('Service error getting feed cost analytics:', error);
      throw error;
    }
  },
  
  // Get farm-wide feed cost analytics
  getFarmFeedCostAnalytics: async (farmId, userId, period = 'month') => {
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
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'quarter':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        case 'year':
          startDate = new Date(now.setDate(now.getDate() - 365));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }
      
      // Get all feed records with cost for the farm
      const feedRecords = await Feed.find({
        farm: farmId,
        feedingTime: { $gte: startDate },
        'cost.amount': { $exists: true, $gt: 0 },
      })
      .populate('animal', 'tagNumber name animalType')
      .lean();
      
      // Group by animal type
      const analytics = {
        totalCost: 0,
        totalQuantity: 0,
        byAnimalType: {},
        byAnimal: {},
        monthlyBreakdown: {},
        mostExpensiveAnimal: null,
        mostCostlyFeedType: null,
      };
      
      // Calculate totals and groupings
      feedRecords.forEach(record => {
        if (record.cost?.amount) {
          analytics.totalCost += record.cost.amount;
          
          // Convert quantity to kg
          let quantityInKg = record.quantity.value;
          if (record.quantity.unit === 'g') quantityInKg = record.quantity.value / 1000;
          if (record.quantity.unit === 'lb') quantityInKg = record.quantity.value * 0.453592;
          if (record.quantity.unit === 'oz') quantityInKg = record.quantity.value * 0.0283495;
          
          analytics.totalQuantity += quantityInKg;
          
          // Group by month for monthly breakdown
          const month = new Date(record.feedingTime).toISOString().slice(0, 7); // YYYY-MM
          if (!analytics.monthlyBreakdown[month]) {
            analytics.monthlyBreakdown[month] = {
              totalCost: 0,
              totalQuantity: 0,
            };
          }
          analytics.monthlyBreakdown[month].totalCost += record.cost.amount;
          analytics.monthlyBreakdown[month].totalQuantity += quantityInKg;
          
          // Track most expensive animal
          if (!analytics.byAnimal[record.animal]) {
            analytics.byAnimal[record.animal] = {
              totalCost: 0,
              animalName: record.animal?.name || 'Unknown',
              animalTag: record.animal?.tagNumber || 'Unknown',
            };
          }
          analytics.byAnimal[record.animal].totalCost += record.cost.amount;
          
          // Track most costly feed type
          if (!analytics.byAnimalType[record.feedType]) {
            analytics.byAnimalType[record.feedType] = {
              totalCost: 0,
              totalQuantity: 0,
            };
          }
          analytics.byAnimalType[record.feedType].totalCost += record.cost.amount;
          analytics.byAnimalType[record.feedType].totalQuantity += quantityInKg;
        }
      });
      
      // Find most expensive animal
      let maxCost = 0;
      Object.entries(analytics.byAnimal).forEach(([animalId, data]) => {
        if (data.totalCost > maxCost) {
          maxCost = data.totalCost;
          analytics.mostExpensiveAnimal = {
            animalId,
            name: data.animalName,
            tag: data.animalTag,
            totalCost: data.totalCost,
          };
        }
      });
      
      // Find most costly feed type
      let maxFeedTypeCost = 0;
      Object.entries(analytics.byAnimalType).forEach(([feedType, data]) => {
        if (data.totalCost > maxFeedTypeCost) {
          maxFeedTypeCost = data.totalCost;
          analytics.mostCostlyFeedType = {
            feedType,
            totalCost: data.totalCost,
            costPerKg: data.totalQuantity > 0 ? data.totalCost / data.totalQuantity : 0,
          };
        }
      });
      
      // Calculate cost per kg
      analytics.costPerKg = analytics.totalQuantity > 0 ? analytics.totalCost / analytics.totalQuantity : 0;
      
      return analytics;
    } catch (error) {
      console.error('Service error getting farm feed cost analytics:', error);
      throw error;
    }
  },
};

module.exports = feedService;