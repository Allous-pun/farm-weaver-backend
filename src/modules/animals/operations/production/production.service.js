const Production = require('./production.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const ProductInventory = require('../inventory/productInventory.model');

const productionService = {
  // Record production from an animal
  recordProduction: async (productionData, userId) => {
    try {
      const {
        animal,
        productionType,
        quantity,
        unit,
        productionDate,
        productionTime,
        qualityMetrics,
        lactationNumber,
        lactationDay,
        collectionMethod,
        healthAtProduction,
        feedAtProduction,
        environment,
        batchId,
        batchName,
        isBatchProduction,
        notes,
      } = productionData;
      
      // Get the animal
      const animalRecord = await Animal.findById(animal)
        .populate('animalType', 'name category productionTypes')
        .lean();
      
      if (!animalRecord) {
        throw new Error('Animal not found');
      }
      
      // Check if animal is alive and active
      if (animalRecord.status !== 'alive' || !animalRecord.isActive) {
        throw new Error('Animal is not alive or active');
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: animalRecord.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Check if production type is valid for this animal type
      const animalType = await AnimalType.findById(animalRecord.animalType._id).lean();
      const productionTypes = animalType?.productionTypes || [];
      
      if (productionTypes.length > 0 && !productionTypes.includes(productionType)) {
        throw new Error(`Production type '${productionType}' is not valid for ${animalType.name}`);
      }
      
      // Create production record
      const production = new Production({
        animal,
        farm: animalRecord.farm,
        animalType: animalRecord.animalType._id,
        productionType,
        quantity,
        unit,
        productionDate: productionDate || new Date(),
        productionTime,
        qualityMetrics: qualityMetrics || {},
        lactationNumber,
        lactationDay,
        collectionMethod: collectionMethod || 'manual',
        healthAtProduction: healthAtProduction || {
          healthStatus: animalRecord.healthStatus,
          bodyConditionScore: null,
          temperature: null,
          notes: '',
        },
        feedAtProduction,
        environment,
        batchId,
        batchName,
        isBatchProduction: isBatchProduction || false,
        notes,
        recordedBy: userId,
      });
      
      await production.save();
      
      // Add to product inventory
      await productionService.addProductionToInventory(production, userId);
      
      return production;
    } catch (error) {
      console.error('Error recording production:', error);
      throw error;
    }
  },
  
  // Add production to product inventory
  addProductionToInventory: async (production, userId) => {
    try {
      // Map production type to product type
      const productionToProductMap = {
        'milk': 'milk',
        'eggs': 'eggs',
        'wool': 'wool',
        'honey': 'honey',
        'manure': 'manure',
        'hair_fiber': 'other',
        'semen': 'other',
        'other': 'other',
      };
      
      const productType = productionToProductMap[production.productionType];
      
      if (!productType) {
        console.warn(`No product type mapping for production type: ${production.productionType}`);
        return null;
      }
      
      // Create product name
      const productName = productionService.generateProductName(production);
      
      // Check if product already exists in inventory
      let product = await ProductInventory.findOne({
        farm: production.farm,
        productType,
        productName,
        animalType: production.animalType,
        qualityGrade: production.qualityMetrics?.grade || 'standard',
        status: 'available',
        isActive: true,
      });
      
      if (product) {
        // Update existing product quantity
        product.quantity += production.quantity;
        await product.save();
      } else {
        // Create new product inventory
        product = new ProductInventory({
          farm: production.farm,
          productType,
          productName,
          animalType: production.animalType,
          sourceAnimal: production.animal,
          productionEvent: production._id,
          quantity: production.quantity,
          unit: production.unit,
          qualityGrade: production.qualityMetrics?.grade || 'standard',
          unitPrice: null, // Pricing handled separately
          productionDate: production.productionDate,
          storageConditions: productionService.getStorageConditions(production.productionType),
          status: 'available',
          notes: `Produced by animal ${production.animal} on ${production.productionDate}`,
          createdBy: userId,
        });
        
        await product.save();
      }
      
      // Update production record with inventory reference
      production.status = 'processed';
      await production.save();
      
      return product;
    } catch (error) {
      console.error('Error adding production to inventory:', error);
      throw error;
    }
  },
  
  // Generate product name based on production details
  generateProductName: (production) => {
    const animalTypeName = production.animalType?.name || 'Animal';
    const grade = production.qualityMetrics?.grade || 'standard';
    const gradeLabel = grade.charAt(0).toUpperCase() + grade.slice(1);
    
    const productNames = {
      'milk': `${animalTypeName} Milk - ${gradeLabel}`,
      'eggs': `${animalTypeName} Eggs - ${gradeLabel}`,
      'wool': `${animalTypeName} Wool - ${gradeLabel}`,
      'honey': 'Honey',
      'manure': `${animalTypeName} Manure`,
      'hair_fiber': `${animalTypeName} Fiber`,
      'semen': `${animalTypeName} Semen`,
      'other': `${animalTypeName} Product`,
    };
    
    return productNames[production.productionType] || `${animalTypeName} ${production.productionType}`;
  },
  
  // Get storage conditions based on product type
  getStorageConditions: (productionType) => {
    const storageMap = {
      'milk': 'refrigerated',
      'eggs': 'refrigerated',
      'wool': 'dry',
      'honey': 'room_temp',
      'manure': 'dry',
      'hair_fiber': 'dry',
      'semen': 'frozen',
      'other': 'room_temp',
    };
    
    return storageMap[productionType] || 'room_temp';
  },
  
  // Get production records by animal
  getProductionByAnimal: async (animalId, userId, filters = {}) => {
    try {
      const animal = await Animal.findById(animalId).lean();
      
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
      
      const query = { animal: animalId, isActive: true };
      
      // Apply filters
      if (filters.productionType) {
        query.productionType = filters.productionType;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.productionDate = {};
        if (filters.dateFrom) {
          query.productionDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.productionDate.$lte = new Date(filters.dateTo);
        }
      }
      
      if (filters.grade) {
        query['qualityMetrics.grade'] = filters.grade;
      }
      
      const productions = await Production.find(query)
        .sort({ productionDate: -1 })
        .lean();
      
      return productions;
    } catch (error) {
      console.error('Error fetching production by animal:', error);
      throw error;
    }
  },
  
  // Get production records by farm
  getProductionByFarm: async (farmId, userId, filters = {}) => {
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
      
      const query = { farm: farmId, isActive: true };
      
      // Apply filters
      if (filters.productionType) {
        query.productionType = filters.productionType;
      }
      
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }
      
      if (filters.animal) {
        query.animal = filters.animal;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.productionDate = {};
        if (filters.dateFrom) {
          query.productionDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.productionDate.$lte = new Date(filters.dateTo);
        }
      }
      
      if (filters.grade) {
        query['qualityMetrics.grade'] = filters.grade;
      }
      
      if (filters.batchId) {
        query.batchId = filters.batchId;
      }
      
      const productions = await Production.find(query)
        .populate({
          path: 'animal',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'animalType',
          select: 'name',
        })
        .sort({ productionDate: -1 })
        .lean();
      
      return productions;
    } catch (error) {
      console.error('Error fetching production by farm:', error);
      throw error;
    }
  },
  
  // Get production statistics for an animal
  getAnimalProductionStatistics: async (animalId, userId) => {
    try {
      const animal = await Animal.findById(animalId).lean();
      
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
      
      // Get all production for this animal
      const productions = await Production.find({
        animal: animalId,
        isActive: true,
      }).lean();
      
      const statistics = {
        totalProductions: productions.length,
        totalQuantity: 0,
        byProductionType: {},
        byMonth: {},
        byQuality: {},
        averageDailyProduction: 0,
        trends: [],
      };
      
      if (productions.length === 0) {
        return statistics;
      }
      
      // Calculate statistics
      const now = new Date();
      const animalAgeDays = animal.dateOfBirth 
        ? Math.floor((now - new Date(animal.dateOfBirth)) / (1000 * 60 * 60 * 24))
        : 0;
      
      productions.forEach(production => {
        // Total quantity
        statistics.totalQuantity += production.quantity;
        
        // By production type
        if (!statistics.byProductionType[production.productionType]) {
          statistics.byProductionType[production.productionType] = {
            count: 0,
            totalQuantity: 0,
            averageQuantity: 0,
          };
        }
        statistics.byProductionType[production.productionType].count++;
        statistics.byProductionType[production.productionType].totalQuantity += production.quantity;
        
        // By month
        const productionDate = new Date(production.productionDate);
        const monthKey = `${productionDate.getFullYear()}-${String(productionDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!statistics.byMonth[monthKey]) {
          statistics.byMonth[monthKey] = {
            count: 0,
            totalQuantity: 0,
          };
        }
        statistics.byMonth[monthKey].count++;
        statistics.byMonth[monthKey].totalQuantity += production.quantity;
        
        // By quality
        const grade = production.qualityMetrics?.grade || 'standard';
        if (!statistics.byQuality[grade]) {
          statistics.byQuality[grade] = 0;
        }
        statistics.byQuality[grade]++;
      });
      
      // Calculate averages
      Object.keys(statistics.byProductionType).forEach(type => {
        const data = statistics.byProductionType[type];
        data.averageQuantity = data.count > 0 ? data.totalQuantity / data.count : 0;
      });
      
      // Calculate average daily production (if animal is at least 30 days old)
      if (animalAgeDays >= 30) {
        statistics.averageDailyProduction = statistics.totalQuantity / animalAgeDays;
      }
      
      // Generate trends (last 6 months)
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        last6Months.push({
          month: monthKey,
          count: statistics.byMonth[monthKey]?.count || 0,
          quantity: statistics.byMonth[monthKey]?.totalQuantity || 0,
        });
      }
      statistics.trends = last6Months;
      
      return statistics;
    } catch (error) {
      console.error('Error fetching animal production statistics:', error);
      throw error;
    }
  },
  
  // Get production statistics for a farm
  getFarmProductionStatistics: async (farmId, userId, filters = {}) => {
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
      
      const query = { farm: farmId, isActive: true };
      
      // Apply filters
      if (filters.dateFrom || filters.dateTo) {
        query.productionDate = {};
        if (filters.dateFrom) {
          query.productionDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.productionDate.$lte = new Date(filters.dateTo);
        }
      }
      
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }
      
      const productions = await Production.find(query)
        .populate('animal', 'tagNumber name')
        .populate('animalType', 'name')
        .lean();
      
      const statistics = {
        totalProductions: productions.length,
        totalQuantity: 0,
        totalAnimals: 0,
        byProductionType: {},
        byAnimalType: {},
        byAnimal: {},
        byQuality: {},
        dailyAverage: 0,
        topProducers: [],
      };
      
      if (productions.length === 0) {
        return statistics;
      }
      
      const animalSet = new Set();
      const dateRange = filters.dateFrom && filters.dateTo 
        ? (new Date(filters.dateTo) - new Date(filters.dateFrom)) / (1000 * 60 * 60 * 24)
        : 30; // Default to 30 days if no date range
      
      productions.forEach(production => {
        // Total quantity
        statistics.totalQuantity += production.quantity;
        
        // Track unique animals
        animalSet.add(production.animal._id.toString());
        
        // By production type
        if (!statistics.byProductionType[production.productionType]) {
          statistics.byProductionType[production.productionType] = {
            count: 0,
            totalQuantity: 0,
            averageQuantity: 0,
          };
        }
        statistics.byProductionType[production.productionType].count++;
        statistics.byProductionType[production.productionType].totalQuantity += production.quantity;
        
        // By animal type
        const animalTypeName = production.animalType?.name || 'Unknown';
        if (!statistics.byAnimalType[animalTypeName]) {
          statistics.byAnimalType[animalTypeName] = {
            count: 0,
            totalQuantity: 0,
            averageQuantity: 0,
          };
        }
        statistics.byAnimalType[animalTypeName].count++;
        statistics.byAnimalType[animalTypeName].totalQuantity += production.quantity;
        
        // By animal
        const animalId = production.animal._id.toString();
        const animalName = production.animal.name || production.animal.tagNumber;
        if (!statistics.byAnimal[animalId]) {
          statistics.byAnimal[animalId] = {
            name: animalName,
            count: 0,
            totalQuantity: 0,
            averageQuantity: 0,
          };
        }
        statistics.byAnimal[animalId].count++;
        statistics.byAnimal[animalId].totalQuantity += production.quantity;
        
        // By quality
        const grade = production.qualityMetrics?.grade || 'standard';
        if (!statistics.byQuality[grade]) {
          statistics.byQuality[grade] = 0;
        }
        statistics.byQuality[grade]++;
      });
      
      // Calculate total animals
      statistics.totalAnimals = animalSet.size;
      
      // Calculate averages
      Object.keys(statistics.byProductionType).forEach(type => {
        const data = statistics.byProductionType[type];
        data.averageQuantity = data.count > 0 ? data.totalQuantity / data.count : 0;
      });
      
      Object.keys(statistics.byAnimalType).forEach(type => {
        const data = statistics.byAnimalType[type];
        data.averageQuantity = data.count > 0 ? data.totalQuantity / data.count : 0;
      });
      
      Object.keys(statistics.byAnimal).forEach(animalId => {
        const data = statistics.byAnimal[animalId];
        data.averageQuantity = data.count > 0 ? data.totalQuantity / data.count : 0;
      });
      
      // Calculate daily average
      statistics.dailyAverage = dateRange > 0 ? statistics.totalQuantity / dateRange : statistics.totalQuantity;
      
      // Identify top producers
      statistics.topProducers = Object.entries(statistics.byAnimal)
        .map(([animalId, data]) => ({
          animalId,
          name: data.name,
          totalQuantity: data.totalQuantity,
          averageQuantity: data.averageQuantity,
          count: data.count,
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 10);
      
      return statistics;
    } catch (error) {
      console.error('Error fetching farm production statistics:', error);
      throw error;
    }
  },
  
  // Get production trends for analysis
  getProductionTrends: async (farmId, userId, period = 'month', productionType = null) => {
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
      
      // Calculate date range based on period
      const endDate = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }
      
      const query = {
        farm: farmId,
        productionDate: { $gte: startDate, $lte: endDate },
        isActive: true,
      };
      
      if (productionType) {
        query.productionType = productionType;
      }
      
      const productions = await Production.find(query)
        .select('productionDate quantity productionType')
        .lean();
      
      // Group by time period
      const trends = {};
      const interval = productionService.getTimeInterval(period);
      
      productions.forEach(production => {
        const date = new Date(production.productionDate);
        const timeKey = productionService.getTimeKey(date, interval);
        
        if (!trends[timeKey]) {
          trends[timeKey] = {
            date: timeKey,
            totalQuantity: 0,
            count: 0,
            byType: {},
          };
        }
        
        trends[timeKey].totalQuantity += production.quantity;
        trends[timeKey].count++;
        
        if (!trends[timeKey].byType[production.productionType]) {
          trends[timeKey].byType[production.productionType] = 0;
        }
        trends[timeKey].byType[production.productionType] += production.quantity;
      });
      
      // Convert to array and sort by date
      const trendArray = Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate growth/decline
      if (trendArray.length >= 2) {
        const firstPeriod = trendArray[0].totalQuantity;
        const lastPeriod = trendArray[trendArray.length - 1].totalQuantity;
        
        return {
          period,
          trends: trendArray,
          summary: {
            totalProductions: productions.length,
            totalQuantity: trendArray.reduce((sum, t) => sum + t.totalQuantity, 0),
            growthRate: firstPeriod > 0 
              ? ((lastPeriod - firstPeriod) / firstPeriod) * 100 
              : lastPeriod > 0 ? 100 : 0,
            averageDaily: trendArray.length > 0 
              ? trendArray.reduce((sum, t) => sum + t.totalQuantity, 0) / trendArray.length 
              : 0,
          },
        };
      }
      
      return {
        period,
        trends: trendArray,
        summary: {
          totalProductions: productions.length,
          totalQuantity: trendArray.reduce((sum, t) => sum + t.totalQuantity, 0),
          growthRate: 0,
          averageDaily: 0,
        },
      };
    } catch (error) {
      console.error('Error fetching production trends:', error);
      throw error;
    }
  },
  
  // Get time interval for grouping
  getTimeInterval: (period) => {
    switch (period) {
      case 'week': return 'day';
      case 'month': return 'day';
      case 'quarter': return 'week';
      case 'year': return 'month';
      default: return 'day';
    }
  },
  
  // Get time key for grouping
  getTimeKey: (date, interval) => {
    switch (interval) {
      case 'day':
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const year = date.getFullYear();
        const week = productionService.getWeekNumber(date);
        return `${year}-W${String(week).padStart(2, '0')}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  },
  
  // Get week number
  getWeekNumber: (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },
  
  // Get production alerts (drops, quality issues)
  getProductionAlerts: async (farmId, userId, days = 7) => {
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
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Get recent productions
      const recentProductions = await Production.find({
        farm: farmId,
        productionDate: { $gte: cutoffDate },
        isActive: true,
      })
        .populate('animal', 'tagNumber name')
        .populate('animalType', 'name')
        .lean();
      
      const alerts = {
        productionDrops: [],
        qualityIssues: [],
        irregularPatterns: [],
        summary: {
          totalAlerts: 0,
          productionDrops: 0,
          qualityIssues: 0,
          irregularPatterns: 0,
        },
      };
      
      if (recentProductions.length === 0) {
        return alerts;
      }
      
      // Group by animal and production type
      const animalProductions = {};
      
      recentProductions.forEach(production => {
        const animalId = production.animal._id.toString();
        const productionType = production.productionType;
        
        if (!animalProductions[animalId]) {
          animalProductions[animalId] = {};
        }
        
        if (!animalProductions[animalId][productionType]) {
          animalProductions[animalId][productionType] = [];
        }
        
        animalProductions[animalId][productionType].push(production);
      });
      
      // Analyze each animal's production
      Object.entries(animalProductions).forEach(([animalId, typeProductions]) => {
        Object.entries(typeProductions).forEach(([productionType, productions]) => {
          // Sort by date
          productions.sort((a, b) => new Date(a.productionDate) - new Date(b.productionDate));
          
          // Check for production drops
          if (productions.length >= 3) {
            const lastThree = productions.slice(-3);
            const quantities = lastThree.map(p => p.quantity);
            
            // Check if last production is significantly lower
            const averageFirstTwo = (quantities[0] + quantities[1]) / 2;
            const lastQuantity = quantities[2];
            
            if (averageFirstTwo > 0 && lastQuantity < averageFirstTwo * 0.7) {
              alerts.productionDrops.push({
                animal: productions[0].animal,
                productionType,
                previousAverage: averageFirstTwo,
                current: lastQuantity,
                dropPercentage: ((averageFirstTwo - lastQuantity) / averageFirstTwo) * 100,
                date: lastThree[2].productionDate,
                severity: 'medium',
              });
              alerts.summary.productionDrops++;
            }
          }
          
          // Check for quality issues
          productions.forEach(production => {
            const qualitySummary = production.getQualitySummary?.() || { issues: [] };
            if (qualitySummary.issues.length > 0) {
              alerts.qualityIssues.push({
                animal: production.animal,
                productionType,
                productionDate: production.productionDate,
                issues: qualitySummary.issues,
                grade: production.qualityMetrics?.grade || 'standard',
                severity: 'low',
              });
              alerts.summary.qualityIssues++;
            }
          });
        });
      });
      
      alerts.summary.totalAlerts = 
        alerts.summary.productionDrops + 
        alerts.summary.qualityIssues + 
        alerts.summary.irregularPatterns;
      
      return alerts;
    } catch (error) {
      console.error('Error fetching production alerts:', error);
      throw error;
    }
  },
  
  // Update production record
  updateProduction: async (productionId, userId, updateData) => {
    try {
      const production = await Production.findById(productionId);
      
      if (!production) {
        throw new Error('Production record not found');
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: production.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Don't allow changing animal, farm, or animalType
      if (updateData.animal || updateData.farm || updateData.animalType) {
        throw new Error('Cannot change animal, farm, or animal type reference');
      }
      
      // Update production
      Object.keys(updateData).forEach(key => {
        if (key !== 'animal' && key !== 'farm' && key !== 'animalType') {
          production[key] = updateData[key];
        }
      });
      
      await production.save();
      
      return production;
    } catch (error) {
      console.error('Error updating production:', error);
      throw error;
    }
  },
  
  // Delete production record (soft delete)
  deleteProduction: async (productionId, userId) => {
    try {
      const production = await Production.findById(productionId);
      
      if (!production) {
        throw new Error('Production record not found');
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: production.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Soft delete
      production.isActive = false;
      await production.save();
      
      return production;
    } catch (error) {
      console.error('Error deleting production:', error);
      throw error;
    }
  },
  
  // Get production types available for animal type
  getProductionTypesForAnimalType: async (animalTypeId, userId) => {
    try {
      const animalType = await AnimalType.findById(animalTypeId).lean();
      
      if (!animalType) {
        throw new Error('Animal type not found');
      }
      
      // Get production types from animal type or use defaults
      const productionTypes = animalType.productionTypes || [];
      
      // If no specific types defined, suggest based on category
      if (productionTypes.length === 0) {
        const category = animalType.category?.toLowerCase() || '';
        
        if (category.includes('dairy') || category.includes('milk')) {
          productionTypes.push('milk');
        }
        if (category.includes('poultry') || category.includes('chicken')) {
          productionTypes.push('eggs');
        }
        if (category.includes('sheep') || category.includes('wool')) {
          productionTypes.push('wool');
        }
        if (category.includes('bee')) {
          productionTypes.push('honey');
        }
        
        // All animals produce manure
        productionTypes.push('manure');
      }
      
      // Map to display format
      const productionTypeLabels = {
        'milk': { label: 'Milk', units: ['liter', 'gallon', 'ml'] },
        'eggs': { label: 'Eggs', units: ['dozen', 'piece'] },
        'wool': { label: 'Wool', units: ['kg', 'lb', 'gram'] },
        'honey': { label: 'Honey', units: ['kg', 'lb', 'liter'] },
        'manure': { label: 'Manure', units: ['kg', 'lb'] },
        'hair_fiber': { label: 'Hair/Fiber', units: ['kg', 'lb', 'gram'] },
        'semen': { label: 'Semen', units: ['ml', 'dose'] },
        'other': { label: 'Other', units: ['kg', 'lb', 'liter', 'piece'] },
      };
      
      return productionTypes.map(type => ({
        value: type,
        ...productionTypeLabels[type] || { label: type, units: ['kg', 'lb'] },
      }));
    } catch (error) {
      console.error('Error getting production types:', error);
      throw error;
    }
  },
};

module.exports = productionService;