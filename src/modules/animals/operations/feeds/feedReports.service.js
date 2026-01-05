// src/modules/animals/operations/feeds/feedReports.service.js
const Feed = require('./feed.model');
const FeedSchedule = require('./feedSchedule.model');
const FeedInventory = require('./feedInventory.model');
const Animal = require('../../animalRecords/animal.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const Farm = require('../../../farms/farm.model');

const feedReportsService = {
  // Generate feed consumption report
  generateFeedConsumptionReport: async (farmId, userId, startDate, endDate) => {
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
      
      // Get all feed records in date range
      const feedRecords = await Feed.find({
        farm: farmId,
        feedingTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        isCompleted: true,
      })
      .populate('animal', 'tagNumber name animalType')
      .lean();
      
      // Group data for report
      const report = {
        farmName: farm.name,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        summary: {
          totalFeedings: feedRecords.length,
          totalCost: 0,
          totalQuantity: 0,
          animalsFed: new Set(),
          feedTypesUsed: new Set(),
        },
        byAnimal: {},
        byFeedType: {},
        dailyBreakdown: {},
        detailedRecords: feedRecords.map(record => ({
          date: record.feedingTime,
          animal: record.animal?.name || 'Unknown',
          animalTag: record.animal?.tagNumber || 'Unknown',
          feedType: record.feedType,
          quantity: `${record.quantity.value} ${record.quantity.unit}`,
          cost: record.cost?.amount ? `${record.cost.amount} ${record.cost.currency || 'KSH'}` : 'Not recorded',
          notes: record.notes,
        })),
      };
      
      // Calculate totals and groupings
      feedRecords.forEach(record => {
        // Update summary
        if (record.cost?.amount) {
          report.summary.totalCost += record.cost.amount;
        }
        report.summary.animalsFed.add(record.animal.toString());
        report.summary.feedTypesUsed.add(record.feedType);
        
        // Convert quantity to kg for total
        let quantityInKg = record.quantity.value;
        if (record.quantity.unit === 'g') quantityInKg = record.quantity.value / 1000;
        if (record.quantity.unit === 'lb') quantityInKg = record.quantity.value * 0.453592;
        report.summary.totalQuantity += quantityInKg;
        
        // Group by animal
        const animalId = record.animal.toString();
        if (!report.byAnimal[animalId]) {
          report.byAnimal[animalId] = {
            name: record.animal?.name || 'Unknown',
            tag: record.animal?.tagNumber || 'Unknown',
            totalFeedings: 0,
            totalCost: 0,
            totalQuantity: 0,
            byFeedType: {},
          };
        }
        report.byAnimal[animalId].totalFeedings++;
        if (record.cost?.amount) {
          report.byAnimal[animalId].totalCost += record.cost.amount;
        }
        report.byAnimal[animalId].totalQuantity += quantityInKg;
        
        // Group by animal feed type
        if (!report.byAnimal[animalId].byFeedType[record.feedType]) {
          report.byAnimal[animalId].byFeedType[record.feedType] = {
            totalFeedings: 0,
            totalCost: 0,
            totalQuantity: 0,
          };
        }
        report.byAnimal[animalId].byFeedType[record.feedType].totalFeedings++;
        if (record.cost?.amount) {
          report.byAnimal[animalId].byFeedType[record.feedType].totalCost += record.cost.amount;
        }
        report.byAnimal[animalId].byFeedType[record.feedType].totalQuantity += quantityInKg;
        
        // Group by feed type overall
        if (!report.byFeedType[record.feedType]) {
          report.byFeedType[record.feedType] = {
            totalFeedings: 0,
            totalCost: 0,
            totalQuantity: 0,
            animalsUsing: new Set(),
          };
        }
        report.byFeedType[record.feedType].totalFeedings++;
        if (record.cost?.amount) {
          report.byFeedType[record.feedType].totalCost += record.cost.amount;
        }
        report.byFeedType[record.feedType].totalQuantity += quantityInKg;
        report.byFeedType[record.feedType].animalsUsing.add(animalId);
        
        // Daily breakdown
        const dateKey = new Date(record.feedingTime).toISOString().split('T')[0];
        if (!report.dailyBreakdown[dateKey]) {
          report.dailyBreakdown[dateKey] = {
            totalFeedings: 0,
            totalCost: 0,
            totalQuantity: 0,
            animalsFed: new Set(),
          };
        }
        report.dailyBreakdown[dateKey].totalFeedings++;
        if (record.cost?.amount) {
          report.dailyBreakdown[dateKey].totalCost += record.cost.amount;
        }
        report.dailyBreakdown[dateKey].totalQuantity += quantityInKg;
        report.dailyBreakdown[dateKey].animalsFed.add(animalId);
      });
      
      // Convert sets to counts/arrays for JSON serialization
      report.summary.animalsFed = report.summary.animalsFed.size;
      report.summary.feedTypesUsed = Array.from(report.summary.feedTypesUsed);
      
      Object.values(report.byFeedType).forEach(data => {
        data.animalsUsing = data.animalsUsing.size;
      });
      
      Object.values(report.dailyBreakdown).forEach(data => {
        data.animalsFed = data.animalsFed.size;
      });
      
      // Calculate averages
      report.summary.averageCostPerFeeding = report.summary.totalFeedings > 0 ? 
        report.summary.totalCost / report.summary.totalFeedings : 0;
      report.summary.averageQuantityPerFeeding = report.summary.totalFeedings > 0 ? 
        report.summary.totalQuantity / report.summary.totalFeedings : 0;
      
      return report;
    } catch (error) {
      console.error('Service error generating feed consumption report:', error);
      throw error;
    }
  },
  
  // Generate inventory report
  generateInventoryReport: async (farmId, userId) => {
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
      
      // Get all inventory items
      const inventoryItems = await FeedInventory.find({
        farm: farmId,
        isActive: true,
      }).lean();
      
      // Get recent consumption to estimate usage rates
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentFeeds = await Feed.find({
        farm: farmId,
        feedingTime: { $gte: thirtyDaysAgo },
        isCompleted: true,
      }).lean();
      
      const report = {
        farmName: farm.name,
        generatedAt: new Date().toISOString(),
        summary: {
          totalItems: inventoryItems.length,
          totalValue: 0,
          itemsNeedingReorder: 0,
          itemsExpiringSoon: 0,
        },
        inventoryItems: [],
        consumptionAnalysis: {},
        recommendations: [],
      };
      
      // Analyze inventory
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      inventoryItems.forEach(item => {
        // Calculate item value
        const itemValue = item.purchasePrice?.amount || 0;
        report.summary.totalValue += itemValue;
        
        // Check reorder status
        if (item.needsReorder) {
          report.summary.itemsNeedingReorder++;
          report.recommendations.push({
            type: 'reorder',
            item: item.customFeedName || item.feedType,
            message: `Reorder ${item.feedType} (Current: ${item.currentStock.value} ${item.currentStock.unit})`,
            urgency: 'high',
          });
        }
        
        // Check expiration
        if (item.expirationDate && item.expirationDate <= thirtyDaysFromNow) {
          report.summary.itemsExpiringSoon++;
          const daysUntilExpiry = Math.ceil((item.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
          report.recommendations.push({
            type: 'expiration',
            item: item.customFeedName || item.feedType,
            message: `${item.feedType} expires in ${daysUntilExpiry} days`,
            urgency: daysUntilExpiry <= 7 ? 'high' : daysUntilExpiry <= 30 ? 'medium' : 'low',
          });
        }
        
        // Add to inventory list
        report.inventoryItems.push({
          feedType: item.feedType,
          customName: item.customFeedName,
          brand: item.brand,
          currentStock: `${item.currentStock.value} ${item.currentStock.unit}`,
          minimumLevel: item.minimumStockLevel ? `${item.minimumStockLevel.value} ${item.minimumStockLevel.unit}` : 'Not set',
          purchasePrice: item.purchasePrice?.amount ? 
            `${item.purchasePrice.amount} ${item.purchasePrice.currency || 'KSH'}` : 'Not recorded',
          storageLocation: item.storageLocation,
          expirationDate: item.expirationDate,
          needsReorder: item.needsReorder,
          lastUpdated: item.updatedAt,
        });
      });
      
      // Analyze consumption by feed type
      recentFeeds.forEach(feed => {
        if (!report.consumptionAnalysis[feed.feedType]) {
          report.consumptionAnalysis[feed.feedType] = {
            totalQuantity: 0,
            feedingsCount: 0,
            estimatedMonthlyUsage: 0,
          };
        }
        
        // Convert to kg for consistency
        let quantityInKg = feed.quantity.value;
        if (feed.quantity.unit === 'g') quantityInKg = feed.quantity.value / 1000;
        
        report.consumptionAnalysis[feed.feedType].totalQuantity += quantityInKg;
        report.consumptionAnalysis[feed.feedType].feedingsCount++;
      });
      
      // Calculate monthly usage estimates
      Object.keys(report.consumptionAnalysis).forEach(feedType => {
        const data = report.consumptionAnalysis[feedType];
        data.estimatedMonthlyUsage = data.totalQuantity; // Already for 30 days
        data.averagePerFeeding = data.feedingsCount > 0 ? data.totalQuantity / data.feedingsCount : 0;
      });
      
      return report;
    } catch (error) {
      console.error('Service error generating inventory report:', error);
      throw error;
    }
  },
};

module.exports = feedReportsService;