const productionService = require('./production.service');
const Production = require('./production.model');

const productionController = {
  // Record production
  recordProduction: async (req, res) => {
    try {
      const userId = req.userId;
      const productionData = req.body;
      
      const production = await productionService.recordProduction(productionData, userId);
      
      // Populate for response
      const populatedProduction = await Production.findById(production._id)
        .populate({
          path: 'animal',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'animalType',
          select: 'name',
        })
        .lean();
      
      res.status(201).json({
        status: 'success',
        message: 'Production recorded successfully',
        data: populatedProduction,
      });
    } catch (error) {
      console.error('Error recording production:', error);
      
      if (error.message.includes('Animal not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('not alive') || 
          error.message.includes('Farm not found') || 
          error.message.includes('permission') ||
          error.message.includes('not valid for')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to record production',
      });
    }
  },
  
  // Get production by animal
  getProductionByAnimal: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId } = req.params;
      
      const filters = {
        productionType: req.query.productionType,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        grade: req.query.grade,
      };
      
      const productions = await productionService.getProductionByAnimal(animalId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: productions,
      });
    } catch (error) {
      console.error('Error fetching production by animal:', error);
      
      if (error.message.includes('Animal not found') || 
          error.message.includes('Farm not found') || 
          error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production records',
      });
    }
  },
  
  // Get production by farm
  getProductionByFarm: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        productionType: req.query.productionType,
        animalType: req.query.animalType,
        animal: req.query.animal,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        grade: req.query.grade,
        batchId: req.query.batchId,
      };
      
      const productions = await productionService.getProductionByFarm(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: productions,
      });
    } catch (error) {
      console.error('Error fetching production by farm:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production records',
      });
    }
  },
  
  // Get animal production statistics
  getAnimalProductionStatistics: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId } = req.params;
      
      const statistics = await productionService.getAnimalProductionStatistics(animalId, userId);
      
      res.status(200).json({
        status: 'success',
        data: statistics,
      });
    } catch (error) {
      console.error('Error fetching animal production statistics:', error);
      
      if (error.message.includes('Animal not found') || 
          error.message.includes('Farm not found') || 
          error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production statistics',
      });
    }
  },
  
  // Get farm production statistics
  getFarmProductionStatistics: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        animalType: req.query.animalType,
      };
      
      const statistics = await productionService.getFarmProductionStatistics(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: statistics,
      });
    } catch (error) {
      console.error('Error fetching farm production statistics:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production statistics',
      });
    }
  },
  
  // Get production trends
  getProductionTrends: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      const { period = 'month', productionType } = req.query;
      
      const trends = await productionService.getProductionTrends(farmId, userId, period, productionType);
      
      res.status(200).json({
        status: 'success',
        data: trends,
      });
    } catch (error) {
      console.error('Error fetching production trends:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production trends',
      });
    }
  },
  
  // Get production alerts
  getProductionAlerts: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      const { days = 7 } = req.query;
      
      const alerts = await productionService.getProductionAlerts(farmId, userId, parseInt(days));
      
      res.status(200).json({
        status: 'success',
        data: alerts,
      });
    } catch (error) {
      console.error('Error fetching production alerts:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production alerts',
      });
    }
  },
  
  // Update production record
  updateProduction: async (req, res) => {
    try {
      const userId = req.userId;
      const { productionId } = req.params;
      const updateData = req.body;
      
      const production = await productionService.updateProduction(productionId, userId, updateData);
      
      res.status(200).json({
        status: 'success',
        message: 'Production record updated successfully',
        data: production,
      });
    } catch (error) {
      console.error('Error updating production:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('Cannot change')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to update production record',
      });
    }
  },
  
  // Delete production record
  deleteProduction: async (req, res) => {
    try {
      const userId = req.userId;
      const { productionId } = req.params;
      
      const production = await productionService.deleteProduction(productionId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Production record deleted successfully',
        data: production,
      });
    } catch (error) {
      console.error('Error deleting production:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete production record',
      });
    }
  },
  
  // Get production by ID
  getProductionById: async (req, res) => {
    try {
      const userId = req.userId;
      const { productionId } = req.params;
      
      const production = await Production.findById(productionId)
        .populate({
          path: 'animal',
          select: 'tagNumber name gender breed dateOfBirth healthStatus',
        })
        .populate({
          path: 'animalType',
          select: 'name category',
        })
        .populate({
          path: 'recordedBy',
          select: 'name email',
        })
        .lean();
      
      if (!production) {
        return res.status(404).json({
          status: 'error',
          message: 'Production record not found',
        });
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: production.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission for this production record',
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: production,
      });
    } catch (error) {
      console.error('Error fetching production:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production record',
      });
    }
  },
  
  // Get production dashboard
  getProductionDashboard: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      const { period = 'month' } = req.query;
      
      // Get all data in parallel
      const [
        statistics,
        trends,
        alerts,
        recentProductions,
        topProducers,
      ] = await Promise.all([
        productionService.getFarmProductionStatistics(farmId, userId, { dateFrom: `-${period}` }),
        productionService.getProductionTrends(farmId, userId, period),
        productionService.getProductionAlerts(farmId, userId, 7),
        productionService.getProductionByFarm(farmId, userId, { limit: 10 }),
        productionService.getFarmProductionStatistics(farmId, userId)
          .then(stats => stats.topProducers || []),
      ]);
      
      const dashboard = {
        overview: {
          totalProductions: statistics.totalProductions,
          totalQuantity: statistics.totalQuantity,
          totalAnimals: statistics.totalAnimals,
          dailyAverage: statistics.dailyAverage,
        },
        
        trends: trends.trends,
        
        alerts: {
          total: alerts.summary.totalAlerts,
          productionDrops: alerts.productionDrops.length,
          qualityIssues: alerts.qualityIssues.length,
          recentAlerts: alerts.productionDrops.slice(0, 3).concat(alerts.qualityIssues.slice(0, 3)),
        },
        
        topProducers: topProducers.slice(0, 5),
        
        recentActivity: recentProductions.slice(0, 5),
        
        byProductionType: statistics.byProductionType,
        
        summary: {
          period,
          growthRate: trends.summary?.growthRate || 0,
          averageDaily: trends.summary?.averageDaily || 0,
        },
      };
      
      res.status(200).json({
        status: 'success',
        data: dashboard,
      });
    } catch (error) {
      console.error('Error fetching production dashboard:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production dashboard',
      });
    }
  },
  
  // Get production types for animal type
  getProductionTypes: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalTypeId } = req.params;
      
      const productionTypes = await productionService.getProductionTypesForAnimalType(animalTypeId, userId);
      
      res.status(200).json({
        status: 'success',
        data: productionTypes,
      });
    } catch (error) {
      console.error('Error fetching production types:', error);
      
      if (error.message.includes('Animal type not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch production types',
      });
    }
  },
  
  // Get quality metrics for production type
  getQualityMetrics: async (req, res) => {
    try {
      const { productionType } = req.params;
      
      const qualityMetrics = {
        milk: [
          { field: 'fatContent', label: 'Fat Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'proteinContent', label: 'Protein Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'somaticCellCount', label: 'Somatic Cell Count', type: 'number', min: 0 },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        eggs: [
          { field: 'weight', label: 'Weight (grams)', type: 'number', min: 0 },
          { field: 'shellQuality', label: 'Shell Quality', type: 'select', options: ['excellent', 'good', 'fair', 'poor'] },
          { field: 'yolkColor', label: 'Yolk Color', type: 'select', options: ['pale', 'light', 'medium', 'dark', 'deep'] },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        wool: [
          { field: 'fiberDiameter', label: 'Fiber Diameter (microns)', type: 'number', min: 0 },
          { field: 'stapleLength', label: 'Staple Length (cm)', type: 'number', min: 0 },
          { field: 'color', label: 'Color', type: 'text' },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        honey: [
          { field: 'moistureContent', label: 'Moisture Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'colorGrade', label: 'Color Grade', type: 'select', options: ['water_white', 'extra_white', 'white', 'extra_light_amber', 'light_amber', 'amber'] },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        manure: [
          { field: 'moisture', label: 'Moisture (%)', type: 'number', min: 0, max: 100 },
          { field: 'nitrogenContent', label: 'Nitrogen Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'phosphorusContent', label: 'Phosphorus Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'potassiumContent', label: 'Potassium Content (%)', type: 'number', min: 0, max: 100 },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'feed_grade'] },
        ],
        hair_fiber: [
          { field: 'fiberDiameter', label: 'Fiber Diameter (microns)', type: 'number', min: 0 },
          { field: 'stapleLength', label: 'Staple Length (cm)', type: 'number', min: 0 },
          { field: 'color', label: 'Color', type: 'text' },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        semen: [
          { field: 'volume', label: 'Volume (ml)', type: 'number', min: 0 },
          { field: 'concentration', label: 'Concentration (million/ml)', type: 'number', min: 0 },
          { field: 'motility', label: 'Motility (%)', type: 'number', min: 0, max: 100 },
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
        other: [
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
      };
      
      res.status(200).json({
        status: 'success',
        data: qualityMetrics[productionType] || [
          { field: 'grade', label: 'Grade', type: 'select', options: ['premium', 'standard', 'commercial'] },
        ],
      });
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch quality metrics',
      });
    }
  },
};

module.exports = productionController;