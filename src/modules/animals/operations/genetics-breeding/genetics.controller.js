const geneticsService = require('./genetics.service');
const AnimalGeneticProfile = require('./animalGeneticProfile.model');

const geneticsController = {
  // Get genetic profile for an animal
  getGeneticProfile: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId } = req.params;
      const { refresh = 'false' } = req.query;
      
      const forceRefresh = refresh === 'true';
      
      const profile = await geneticsService.computeGeneticProfile(animalId, forceRefresh);
      
      if (!profile) {
        return res.status(404).json({
          status: 'error',
          message: 'Genetic profile not found',
        });
      }
      
      // Populate animal details
      const populatedProfile = await AnimalGeneticProfile.findById(profile._id)
        .populate({
          path: 'animal',
          select: 'tagNumber name gender dateOfBirth breed status healthStatus animalType',
          populate: {
            path: 'animalType',
            select: 'name category',
          },
        })
        .populate({
          path: 'sire',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'dam',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'knownCloseRelatives.animal',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'breedingRecommendations.recommendedPairs.animal',
          select: 'tagNumber name gender breed',
        })
        .populate({
          path: 'breedingRecommendations.avoidPairs.animal',
          select: 'tagNumber name gender breed',
        })
        .lean();
      
      res.status(200).json({
        status: 'success',
        data: populatedProfile,
      });
    } catch (error) {
      console.error('Error fetching genetic profile:', error);
      
      if (error.message === 'Animal not found') {
        return res.status(404).json({
          status: 'error',
          message: 'Animal not found',
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch genetic profile',
      });
    }
  },

  // Get pedigree tree
  getPedigreeTree: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId } = req.params;
      const { depth = 3 } = req.query;
      
      const tree = await geneticsService.getPedigreeTree(animalId, parseInt(depth));
      
      res.status(200).json({
        status: 'success',
        data: tree,
      });
    } catch (error) {
      console.error('Error fetching pedigree tree:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch pedigree tree',
      });
    }
  },

  // Check inbreeding risk for a pair
  checkInbreedingRisk: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId1, animalId2 } = req.params;
      
      const riskAssessment = await geneticsService.checkInbreedingRisk(animalId1, animalId2);
      
      res.status(200).json({
        status: 'success',
        data: riskAssessment,
      });
    } catch (error) {
      console.error('Error checking inbreeding risk:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check inbreeding risk',
      });
    }
  },

  // Get top breeders in a farm
  getTopBreeders: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      const { limit = 10 } = req.query;
      
      const topBreeders = await geneticsService.getTopBreeders(farmId, parseInt(limit));
      
      res.status(200).json({
        status: 'success',
        data: topBreeders,
      });
    } catch (error) {
      console.error('Error fetching top breeders:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch top breeders',
      });
    }
  },

  // Get breeding pair suggestions
  getBreedingPairSuggestions: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const criteria = {
        minCompatibility: req.query.minCompatibility ? parseInt(req.query.minCompatibility) : 70,
        limit: req.query.limit ? parseInt(req.query.limit) : 5,
        animalType: req.query.animalType || null,
        gender: req.query.gender || null,
      };
      
      const suggestions = await geneticsService.getBreedingPairSuggestions(farmId, criteria);
      
      res.status(200).json({
        status: 'success',
        data: suggestions,
      });
    } catch (error) {
      console.error('Error fetching breeding pair suggestions:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch breeding pair suggestions',
      });
    }
  },

  // Get breeding compatibility for specific pair
  getBreedingCompatibility: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalId1, animalId2 } = req.params;
      
      const profile1 = await geneticsService.computeGeneticProfile(animalId1);
      const profile2 = await geneticsService.computeGeneticProfile(animalId2);
      
      if (!profile1 || !profile2) {
        return res.status(404).json({
          status: 'error',
          message: 'One or both animals not found',
        });
      }
      
      const compatibility = profile1.canBreedWith(profile2);
      const expectedBenefits = geneticsService.calculateExpectedBenefits(profile1, profile2);
      
      res.status(200).json({
        status: 'success',
        data: {
          animal1: profile1.animal,
          animal2: profile2.animal,
          canBreed: compatibility.canBreed,
          compatibilityScore: compatibility.compatibilityScore,
          warnings: compatibility.warnings,
          expectedBenefits,
          recommendations: compatibility.canBreed 
            ? ['Consider this pairing'] 
            : ['Avoid this pairing due to inbreeding risk'],
        },
      });
    } catch (error) {
      console.error('Error checking breeding compatibility:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check breeding compatibility',
      });
    }
  },

  // Update animal type genetics settings
  updateAnimalTypeGeneticsSettings: async (req, res) => {
    try {
      const userId = req.userId;
      const { animalTypeId } = req.params;
      const geneticsSettings = req.body;
      
      // Note: This requires AnimalType model update - will be implemented in animalTypes module
      // For now, return success but log that it needs implementation
      console.log('Animal Type Genetics Settings Update Request:', {
        animalTypeId,
        geneticsSettings,
        userId,
      });
      
      res.status(200).json({
        status: 'success',
        message: 'Genetics settings update received (requires AnimalType model update)',
        data: geneticsSettings,
      });
    } catch (error) {
      console.error('Error updating genetics settings:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update genetics settings',
      });
    }
  },

  // Batch compute genetic profiles for farm
  batchComputeGeneticProfiles: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      // Get all animals in farm
      const animals = await Animal.find({ farm: farmId, status: 'alive' })
        .select('_id')
        .lean();
      
      let processed = 0;
      let errors = [];
      
      // Process in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < animals.length; i += batchSize) {
        const batch = animals.slice(i, i + batchSize);
        
        for (const animal of batch) {
          try {
            await geneticsService.computeGeneticProfile(animal._id, true);
            processed++;
          } catch (error) {
            errors.push({
              animalId: animal._id,
              error: error.message,
            });
          }
        }
      }
      
      res.status(200).json({
        status: 'success',
        message: `Processed ${processed} genetic profiles`,
        data: {
          totalAnimals: animals.length,
          processed,
          failed: errors.length,
          errors: errors.slice(0, 10), // Return first 10 errors
        },
      });
    } catch (error) {
      console.error('Error batch computing genetic profiles:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to batch compute genetic profiles',
      });
    }
  },

  // Get genetics dashboard statistics
  getGeneticsDashboard: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      // Get genetic profiles for the farm
      const profiles = await AnimalGeneticProfile.find({ farm: farmId })
        .populate({
          path: 'animal',
          select: 'tagNumber name gender animalType',
        })
        .lean();
      
      const statistics = {
        totalProfiles: profiles.length,
        activeBreeders: profiles.filter(p => p.breedingProfile.isBreeder).length,
        eligibleBreeders: profiles.filter(p => 
          p.breedingProfile.isBreeder && p.breedingProfile.breedingEligibility === 'eligible'
        ).length,
        
        // Trait distribution
        traitAverages: {
          growthRate: 0,
          fertility: 0,
          offspringViability: 0,
        },
        
        // Inbreeding statistics
        inbreedingStats: {
          lowRisk: 0,    // < 0.1
          mediumRisk: 0, // 0.1 - 0.3
          highRisk: 0,   // > 0.3
        },
        
        // Performance averages
        performanceAverages: {
          offspringSurvivalRate: 0,
          matingSuccessRate: 0,
          pregnancySuccessRate: 0,
        },
      };
      
      // Calculate averages
      if (profiles.length > 0) {
        statistics.traitAverages.growthRate = 
          profiles.reduce((sum, p) => sum + (p.traits.growthRate || 0), 0) / profiles.length;
        
        statistics.traitAverages.fertility = 
          profiles.reduce((sum, p) => sum + (p.traits.fertility || 0), 0) / profiles.length;
        
        statistics.traitAverages.offspringViability = 
          profiles.reduce((sum, p) => sum + (p.traits.offspringViability || 0), 0) / profiles.length;
        
        // Inbreeding stats
        profiles.forEach(profile => {
          if (profile.inbreedingCoefficient < 0.1) {
            statistics.inbreedingStats.lowRisk++;
          } else if (profile.inbreedingCoefficient <= 0.3) {
            statistics.inbreedingStats.mediumRisk++;
          } else {
            statistics.inbreedingStats.highRisk++;
          }
        });
        
        // Performance stats (only for breeders with data)
        const breedersWithData = profiles.filter(p => 
          p.breedingProfile.isBreeder && p.performanceMetrics
        );
        
        if (breedersWithData.length > 0) {
          statistics.performanceAverages.offspringSurvivalRate = 
            breedersWithData.reduce((sum, p) => 
              sum + (p.performanceMetrics.offspringSurvivalRate || 0), 0) / breedersWithData.length;
          
          statistics.performanceAverages.matingSuccessRate = 
            breedersWithData.reduce((sum, p) => 
              sum + (p.performanceMetrics.matingSuccessRate || 0), 0) / breedersWithData.length;
          
          statistics.performanceAverages.pregnancySuccessRate = 
            breedersWithData.reduce((sum, p) => 
              sum + (p.performanceMetrics.pregnancySuccessRate || 0), 0) / breedersWithData.length;
        }
      }
      
      // Get recent breeding recommendations
      const recentRecommendations = await AnimalGeneticProfile.find({
        farm: farmId,
        'breedingProfile.isBreeder': true,
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate({
          path: 'animal',
          select: 'tagNumber name gender',
        })
        .select('animal breedingRecommendations updatedAt')
        .lean();
      
      res.status(200).json({
        status: 'success',
        data: {
          statistics,
          recentRecommendations,
          summary: {
            geneticDiversityScore: geneticsService.calculateGeneticDiversityScore(profiles),
            breedingProgramStrength: geneticsService.calculateBreedingProgramStrength(profiles),
          },
        },
      });
    } catch (error) {
      console.error('Error fetching genetics dashboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch genetics dashboard',
      });
    }
  },
};

// Helper function to calculate genetic diversity score
geneticsService.calculateGeneticDiversityScore = (profiles) => {
  if (profiles.length < 2) return 0;
  
  // Simplified diversity score based on inbreeding coefficients
  const avgInbreeding = profiles.reduce((sum, p) => sum + (p.inbreedingCoefficient || 0), 0) / profiles.length;
  const diversityScore = (1 - avgInbreeding) * 100;
  
  return Math.round(diversityScore);
};

// Helper function to calculate breeding program strength
geneticsService.calculateBreedingProgramStrength = (profiles) => {
  const breeders = profiles.filter(p => p.breedingProfile.isBreeder);
  if (breeders.length === 0) return 0;
  
  const avgSurvivalRate = breeders.reduce((sum, p) => 
    sum + (p.performanceMetrics.offspringSurvivalRate || 0), 0) / breeders.length;
  
  const avgFertility = breeders.reduce((sum, p) => 
    sum + (p.traits.fertility || 5), 0) / breeders.length;
  
  const breederRatio = breeders.length / profiles.length;
  
  // Weighted score
  const strengthScore = 
    (avgSurvivalRate * 0.4) + 
    (avgFertility * 10 * 0.3) + 
    (breederRatio * 100 * 0.3);
  
  return Math.round(strengthScore);
};

module.exports = geneticsController;