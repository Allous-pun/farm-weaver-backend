const AnimalGeneticProfile = require('./animalGeneticProfile.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');
const MatingEvent = require('../reproductions/matingEvent.model');
const Pregnancy = require('../reproductions/pregnancy.model');
const BirthEvent = require('../reproductions/birthEvent.model');
const OffspringTracking = require('../reproductions/offspringTracking.model');

const geneticsService = {
  // Compute or update genetic profile for an animal
  computeGeneticProfile: async (animalId, forceRefresh = false) => {
    try {
      const animal = await Animal.findById(animalId)
        .populate('animalType', 'name category geneticsSettings')
        .populate('sire', 'tagNumber name gender')
        .populate('dam', 'tagNumber name gender')
        .lean();

      if (!animal) {
        throw new Error('Animal not found');
      }

      // Check if profile exists and if refresh is needed
      let profile = await AnimalGeneticProfile.findOne({ animal: animalId });
      
      if (profile && !forceRefresh && 
          (Date.now() - profile.computedAt.getTime()) < 24 * 60 * 60 * 1000) {
        return profile; // Return cached if less than 24 hours old
      }

      if (!profile) {
        profile = new AnimalGeneticProfile({
          animal: animalId,
          farm: animal.farm,
          sire: animal.sire,
          dam: animal.dam,
        });
      }

      // Update breeding profile
      await geneticsService.updateBreedingProfile(profile, animal);
      
      // Update performance metrics
      await geneticsService.updatePerformanceMetrics(profile, animal);
      
      // Update traits
      await geneticsService.updateTraits(profile, animal);
      
      // Update inbreeding awareness
      await geneticsService.updateInbreedingAwareness(profile, animal);
      
      // Update pedigree information
      await geneticsService.updatePedigree(profile, animal);
      
      // Update breeding recommendations
      await geneticsService.updateBreedingRecommendations(profile, animal);
      
      profile.lastUpdated = new Date();
      profile.computedAt = new Date();
      
      await profile.save();
      
      return profile;
    } catch (error) {
      console.error('Error computing genetic profile:', error);
      throw error;
    }
  },

  // Update breeding eligibility and status
  updateBreedingProfile: async (profile, animal) => {
    const now = new Date();
    const ageInDays = Math.floor((now - new Date(animal.dateOfBirth)) / (1000 * 60 * 60 * 24));
    
    // Get animal type settings
    const animalType = await AnimalType.findById(animal.animalType).lean();
    const geneticsSettings = animalType?.geneticsSettings || {};
    
    // Determine if animal is a breeder
    const isBreeder = geneticsService.determineIfBreeder(animal, geneticsSettings);
    
    // Determine breeding eligibility
    const breedingEligibility = geneticsService.determineBreedingEligibility(
      animal, 
      geneticsSettings, 
      ageInDays
    );
    
    profile.breedingProfile = {
      isBreeder,
      breedingEligibility,
      ageAtMaturity: geneticsService.calculateAgeAtMaturity(animal, geneticsSettings),
      firstBreedingAge: geneticsService.calculateFirstBreedingAge(animal),
      lastBreedingDate: await geneticsService.getLastBreedingDate(animal._id),
      breedingSeason: geneticsSettings.breedingSeason || 'unknown',
    };
  },

  // Determine if animal should be considered a breeder
  determineIfBreeder: (animal, geneticsSettings) => {
    if (!['male', 'female'].includes(animal.gender)) return false;
    
    // Check if animal type has genetics enabled
    if (geneticsSettings.enableGenetics === false) return false;
    
    // Check if animal is alive and active
    if (animal.status !== 'alive' || !animal.isActive) return false;
    
    // Check reproductive status for females
    if (animal.gender === 'female') {
      const eligibleStatuses = ['open', 'dry', null];
      return eligibleStatuses.includes(animal.reproductiveStatus);
    }
    
    // Check breeding status for males
    if (animal.gender === 'male') {
      const eligibleStatuses = ['active', null];
      return eligibleStatuses.includes(animal.breedingStatus);
    }
    
    return false;
  },

  // Determine breeding eligibility
  determineBreedingEligibility: (animal, geneticsSettings, ageInDays) => {
    if (animal.gender === 'unknown') return 'ineligible';
    if (animal.status !== 'alive') return 'ineligible';
    
    // Check minimum age
    const minBreedingAge = geneticsSettings.minBreedingAgeDays || 180; // Default 6 months
    if (ageInDays < minBreedingAge) return 'ineligible';
    
    // Check health status
    if (animal.healthStatus === 'poor' || animal.healthStatus === 'critical') {
      return 'restricted';
    }
    
    // Check specific conditions
    if (animal.gender === 'female' && animal.reproductiveStatus === 'infertile') {
      return 'ineligible';
    }
    
    if (animal.gender === 'male' && animal.breedingStatus === 'infertile') {
      return 'ineligible';
    }
    
    return 'eligible';
  },

  // Calculate age at maturity
  calculateAgeAtMaturity: (animal, geneticsSettings) => {
    const maturityAgeDays = geneticsSettings.maturityAgeDays || 365; // Default 1 year
    const dob = new Date(animal.dateOfBirth);
    return new Date(dob.getTime() + maturityAgeDays * 24 * 60 * 60 * 1000);
  },

  // Calculate first breeding age
  calculateFirstBreedingAge: async (animal) => {
    // Find first mating event for this animal
    let firstMating;
    
    if (animal.gender === 'male') {
      firstMating = await MatingEvent.findOne({ sire: animal._id })
        .sort({ matingDate: 1 })
        .lean();
    } else if (animal.gender === 'female') {
      firstMating = await MatingEvent.findOne({ dams: animal._id })
        .sort({ matingDate: 1 })
        .lean();
    }
    
    if (firstMating && firstMating.matingDate) {
      const dob = new Date(animal.dateOfBirth);
      const matingDate = new Date(firstMating.matingDate);
      return Math.floor((matingDate - dob) / (1000 * 60 * 60 * 24));
    }
    
    return null;
  },

  // Get last breeding date
  getLastBreedingDate: async (animalId) => {
    let lastMating;
    
    // Check as sire
    lastMating = await MatingEvent.findOne({ sire: animalId })
      .sort({ matingDate: -1 })
      .lean();
    
    if (!lastMating) {
      // Check as dam
      lastMating = await MatingEvent.findOne({ dams: animalId })
        .sort({ matingDate: -1 })
        .lean();
    }
    
    return lastMating?.matingDate || null;
  },

  // Update performance metrics
  updatePerformanceMetrics: async (profile, animal) => {
    let metrics = {
      totalMatings: 0,
      successfulMatings: 0,
      matingSuccessRate: 0,
      totalPregnancies: 0,
      successfulPregnancies: 0,
      pregnancySuccessRate: 0,
      totalOffspring: 0,
      liveOffspring: 0,
      offspringSurvivalRate: 0,
      averageLitterSize: 0,
      averageGestationDays: 0,
    };
    
    if (animal.gender === 'male') {
      // Male metrics
      const matings = await MatingEvent.find({ sire: animal._id }).lean();
      metrics.totalMatings = matings.length;
      metrics.successfulMatings = matings.filter(m => m.outcome === 'successful').length;
      metrics.matingSuccessRate = metrics.totalMatings > 0 
        ? (metrics.successfulMatings / metrics.totalMatings) * 100 
        : 0;
      
      // Get offspring count from mating events
      const pregnancies = await Pregnancy.find({ sire: animal._id }).lean();
      metrics.totalOffspring = pregnancies.reduce((sum, p) => {
        // Get birth events for each pregnancy
        return sum + (p.actualDeliveryDate ? 1 : 0); // Simplified count
      }, 0);
      
    } else if (animal.gender === 'female') {
      // Female metrics
      const pregnancies = await Pregnancy.find({ dam: animal._id }).lean();
      metrics.totalPregnancies = pregnancies.length;
      metrics.successfulPregnancies = pregnancies.filter(p => 
        p.status === 'delivered' || p.status === 'completed'
      ).length;
      metrics.pregnancySuccessRate = metrics.totalPregnancies > 0
        ? (metrics.successfulPregnancies / metrics.totalPregnancies) * 100
        : 0;
      
      // Calculate average litter size
      const birthEvents = await BirthEvent.find({ dam: animal._id }).lean();
      if (birthEvents.length > 0) {
        const totalOffspring = birthEvents.reduce((sum, b) => sum + (b.totalOffspring || 0), 0);
        metrics.averageLitterSize = totalOffspring / birthEvents.length;
        metrics.totalOffspring = totalOffspring;
        metrics.liveOffspring = birthEvents.reduce((sum, b) => sum + (b.liveBirths || 0), 0);
      }
      
      // Calculate average gestation days
      if (pregnancies.length > 0) {
        const totalGestationDays = pregnancies.reduce((sum, p) => {
          if (p.conceptionDate && p.actualDeliveryDate) {
            const gestationDays = Math.floor(
              (new Date(p.actualDeliveryDate) - new Date(p.conceptionDate)) / (1000 * 60 * 60 * 24)
            );
            return sum + gestationDays;
          }
          return sum;
        }, 0);
        metrics.averageGestationDays = totalGestationDays / metrics.successfulPregnancies;
      }
    }
    
    // Calculate offspring survival rate
    if (metrics.totalOffspring > 0) {
      metrics.offspringSurvivalRate = (metrics.liveOffspring / metrics.totalOffspring) * 100;
    }
    
    profile.performanceMetrics = metrics;
  },

  // Update traits based on performance
  updateTraits: async (profile, animal) => {
    const traits = {
      growthRate: 5,
      fertility: 5,
      litterSizePotential: 5,
      offspringViability: 5,
      temperament: null,
      customTraits: [],
    };
    
    // Calculate growth rate based on weight gain (simplified)
    if (animal.weight?.value && animal.dateOfBirth) {
      const ageInDays = Math.floor(
        (new Date() - new Date(animal.dateOfBirth)) / (1000 * 60 * 60 * 24)
      );
      if (ageInDays > 0) {
        const dailyWeightGain = animal.weight.value / ageInDays;
        // Scale to 1-10 based on expected ranges
        traits.growthRate = Math.min(10, Math.max(1, Math.round(dailyWeightGain * 100)));
      }
    }
    
    // Calculate fertility based on performance metrics
    if (animal.gender === 'male') {
      traits.fertility = Math.min(10, Math.round(profile.performanceMetrics.matingSuccessRate / 10));
    } else if (animal.gender === 'female') {
      traits.fertility = Math.min(10, Math.round(profile.performanceMetrics.pregnancySuccessRate / 10));
    }
    
    // Calculate litter size potential for females
    if (animal.gender === 'female' && profile.performanceMetrics.averageLitterSize > 0) {
      // Scale based on species expectations (simplified)
      const scaledLitterSize = Math.min(10, profile.performanceMetrics.averageLitterSize);
      traits.litterSizePotential = Math.round(scaledLitterSize);
    }
    
    // Calculate offspring viability
    traits.offspringViability = Math.min(
      10, 
      Math.round(profile.performanceMetrics.offspringSurvivalRate / 10)
    );
    
    profile.traits = traits;
  },

  // Update inbreeding awareness
  updateInbreedingAwareness: async (profile, animal) => {
    const knownRelatives = [];
    let inbreedingCoefficient = 0;
    
    // Add parents if known
    if (animal.sire) {
      knownRelatives.push({
        animal: animal.sire,
        relationship: 'parent',
        coefficient: 0.5,
      });
      
      // Check for sire's lineage
      const sireProfile = await AnimalGeneticProfile.findOne({ animal: animal.sire }).lean();
      if (sireProfile?.knownCloseRelatives) {
        sireProfile.knownCloseRelatives.forEach(relative => {
          knownRelatives.push({
            animal: relative.animal,
            relationship: 'grandparent',
            coefficient: 0.25,
          });
        });
      }
    }
    
    if (animal.dam) {
      knownRelatives.push({
        animal: animal.dam,
        relationship: 'parent',
        coefficient: 0.5,
      });
      
      // Check for dam's lineage
      const damProfile = await AnimalGeneticProfile.findOne({ animal: animal.dam }).lean();
      if (damProfile?.knownCloseRelatives) {
        damProfile.knownCloseRelatives.forEach(relative => {
          knownRelatives.push({
            animal: relative.animal,
            relationship: 'grandparent',
            coefficient: 0.25,
          });
        });
      }
    }
    
    // Find siblings
    const siblings = await Animal.find({
      $or: [
        { sire: animal.sire, dam: animal.dam, _id: { $ne: animal._id } },
        { mother: animal.mother, father: animal.father, _id: { $ne: animal._id } },
      ],
    }).lean();
    
    siblings.forEach(sibling => {
      knownRelatives.push({
        animal: sibling._id,
        relationship: 'full_sibling',
        coefficient: 0.5,
      });
    });
    
    // Calculate inbreeding coefficient (simplified)
    if (animal.sire && animal.dam) {
      // Check if sire and dam are related
      const sireProfile = await AnimalGeneticProfile.findOne({ animal: animal.sire }).lean();
      const damProfile = await AnimalGeneticProfile.findOne({ animal: animal.dam }).lean();
      
      if (sireProfile && damProfile) {
        const commonAncestors = sireProfile.knownCloseRelatives?.filter(sireRel =>
          damProfile.knownCloseRelatives?.some(damRel => 
            damRel.animal.toString() === sireRel.animal.toString()
          )
        );
        
        if (commonAncestors?.length > 0) {
          inbreedingCoefficient = commonAncestors.reduce((sum, ancestor) => 
            sum + ancestor.coefficient, 0
          ) / 2;
        }
      }
    }
    
    profile.knownCloseRelatives = knownRelatives;
    profile.inbreedingCoefficient = Math.min(1, inbreedingCoefficient);
  },

  // Update pedigree information
  updatePedigree: async (profile, animal) => {
    const ancestors = [];
    let generation = 1;
    
    // Helper function to trace ancestry
    const traceAncestry = async (currentAnimalId, currentGeneration, maxDepth = 3) => {
      if (currentGeneration > maxDepth) return;
      
      const currentAnimal = await Animal.findById(currentAnimalId)
        .select('sire dam')
        .lean();
      
      if (!currentAnimal) return;
      
      if (currentAnimal.sire) {
        ancestors.push({
          animal: currentAnimal.sire,
          relationship: currentGeneration === 1 ? 'sire' : `great_sire_${currentGeneration}`,
          generation: currentGeneration + 1,
        });
        await traceAncestry(currentAnimal.sire, currentGeneration + 1, maxDepth);
      }
      
      if (currentAnimal.dam) {
        ancestors.push({
          animal: currentAnimal.dam,
          relationship: currentGeneration === 1 ? 'dam' : `great_dam_${currentGeneration}`,
          generation: currentGeneration + 1,
        });
        await traceAncestry(currentAnimal.dam, currentGeneration + 1, maxDepth);
      }
    };
    
    await traceAncestry(animal._id, 1, 3);
    
    // Determine generation (count back to earliest known ancestor)
    if (ancestors.length > 0) {
      generation = Math.max(...ancestors.map(a => a.generation));
    }
    
    profile.pedigree = {
      generation,
      ancestors: ancestors.slice(0, 50), // Limit to 50 ancestors
    };
  },

  // Update breeding recommendations
  updateBreedingRecommendations: async (profile, animal) => {
    if (!profile.breedingProfile.isBreeder || 
        profile.breedingProfile.breedingEligibility !== 'eligible') {
      profile.breedingRecommendations = {
        recommendedPairs: [],
        avoidPairs: [],
      };
      return;
    }
    
    // Find potential breeding partners
    const potentialPartners = await Animal.find({
      farm: animal.farm,
      gender: animal.gender === 'male' ? 'female' : 'male',
      status: 'alive',
      isActive: true,
      _id: { $ne: animal._id },
    })
      .populate('animalType', 'name category')
      .lean();
    
    const recommendedPairs = [];
    const avoidPairs = [];
    
    for (const partner of potentialPartners) {
      // Skip if animal types don't match (for now)
      if (partner.animalType?.toString() !== animal.animalType?.toString()) {
        continue;
      }
      
      const partnerProfile = await AnimalGeneticProfile.findOne({ animal: partner._id }).lean();
      
      if (!partnerProfile || !partnerProfile.breedingProfile.isBreeder) {
        continue;
      }
      
      // Check compatibility
      const compatibility = profile.canBreedWith(partnerProfile);
      
      if (compatibility.canBreed) {
        recommendedPairs.push({
          animal: partner._id,
          compatibilityScore: compatibility.compatibilityScore,
          expectedBenefits: geneticsService.calculateExpectedBenefits(profile, partnerProfile),
          warnings: compatibility.warnings,
        });
      } else {
        avoidPairs.push({
          animal: partner._id,
          reason: compatibility.warnings.join(', '),
          severity: compatibility.warnings.some(w => w.includes('High')) ? 'high' : 'medium',
        });
      }
    }
    
    // Sort by compatibility score
    recommendedPairs.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    profile.breedingRecommendations = {
      recommendedPairs: recommendedPairs.slice(0, 10), // Top 10 recommendations
      avoidPairs: avoidPairs.slice(0, 10), // Top 10 to avoid
    };
  },

  // Calculate expected benefits from pairing
  calculateExpectedBenefits: (profile1, profile2) => {
    const benefits = [];
    
    // Complementary traits
    if (Math.abs(profile1.traits.growthRate - profile2.traits.growthRate) >= 3) {
      benefits.push('Complementary growth traits for improved offspring');
    }
    
    // High viability combination
    if (profile1.traits.offspringViability >= 8 && profile2.traits.offspringViability >= 8) {
      benefits.push('High offspring viability expected');
    }
    
    // Low inbreeding risk
    if (profile1.inbreedingCoefficient < 0.1 && profile2.inbreedingCoefficient < 0.1) {
      benefits.push('Low inbreeding risk');
    }
    
    // High performance combination
    const avgSuccessRate = (profile1.performanceMetrics.offspringSurvivalRate + 
                          profile2.performanceMetrics.offspringSurvivalRate) / 2;
    if (avgSuccessRate > 80) {
      benefits.push('High survival rate expected');
    }
    
    return benefits.length > 0 ? benefits : ['Standard breeding pair'];
  },

  // Get pedigree tree for an animal
  getPedigreeTree: async (animalId, depth = 3) => {
    const tree = {
      animal: null,
      sire: null,
      dam: null,
      ancestors: {},
    };
    
    const buildTree = async (currentId, currentDepth, path = '') => {
      if (currentDepth > depth || !currentId) return null;
      
      const animal = await Animal.findById(currentId)
        .select('tagNumber name gender dateOfBirth breed sire dam')
        .lean();
      
      if (!animal) return null;
      
      const node = {
        id: animal._id.toString(),
        tagNumber: animal.tagNumber,
        name: animal.name,
        gender: animal.gender,
        breed: animal.breed,
        sire: null,
        dam: null,
      };
      
      if (path === '') {
        tree.animal = node;
      } else {
        tree.ancestors[animal._id.toString()] = node;
      }
      
      // Recursively build sire and dam branches
      if (animal.sire) {
        node.sire = await buildTree(animal.sire, currentDepth + 1, `${path}s`);
      }
      
      if (animal.dam) {
        node.dam = await buildTree(animal.dam, currentDepth + 1, `${path}d`);
      }
      
      return animal._id.toString();
    };
    
    await buildTree(animalId, 0);
    return tree;
  },

  // Find potential inbreeding risks for a pair
  checkInbreedingRisk: async (animalId1, animalId2) => {
    const profile1 = await geneticsService.computeGeneticProfile(animalId1);
    const profile2 = await geneticsService.computeGeneticProfile(animalId2);
    
    const closeRelative = profile1.knownCloseRelatives.find(
      rel => rel.animal.toString() === animalId2.toString()
    );
    
    const risks = [];
    let riskLevel = 'low';
    
    if (closeRelative) {
      risks.push({
        relationship: closeRelative.relationship,
        coefficient: closeRelative.coefficient,
        description: geneticsService.getRelationshipDescription(closeRelative.relationship),
      });
      
      if (['parent', 'offspring', 'full_sibling'].includes(closeRelative.relationship)) {
        riskLevel = 'high';
      } else if (['half_sibling', 'grandparent', 'grandchild'].includes(closeRelative.relationship)) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
    }
    
    // Calculate combined inbreeding coefficient
    const combinedCoefficient = (profile1.inbreedingCoefficient + profile2.inbreedingCoefficient) / 2;
    
    return {
      canBreed: riskLevel !== 'high',
      riskLevel,
      risks,
      combinedInbreedingCoefficient: combinedCoefficient,
      recommendations: geneticsService.getBreedingRecommendations(riskLevel, combinedCoefficient),
    };
  },

  // Get relationship description
  getRelationshipDescription: (relationship) => {
    const descriptions = {
      'parent': 'Parent-Offspring relationship (high risk)',
      'offspring': 'Offspring-Parent relationship (high risk)',
      'full_sibling': 'Full siblings (high risk)',
      'half_sibling': 'Half siblings (medium risk)',
      'grandparent': 'Grandparent-Grandchild (medium risk)',
      'grandchild': 'Grandchild-Grandparent (medium risk)',
      'cousin': 'Cousins (low risk)',
    };
    
    return descriptions[relationship] || 'Distant relative';
  },

  // Get breeding recommendations based on risk
  getBreedingRecommendations: (riskLevel, coefficient) => {
    if (riskLevel === 'high') {
      return ['Avoid breeding - close relatives', 'Consider using unrelated animals'];
    } else if (riskLevel === 'medium') {
      return ['Proceed with caution', 'Monitor offspring health closely'];
    } else if (coefficient > 0.3) {
      return ['Moderate inbreeding risk', 'Consider introducing new bloodline'];
    } else {
      return ['Low inbreeding risk', 'Suitable for breeding'];
    }
  },

  // Get top performing breeders in a farm
  getTopBreeders: async (farmId, limit = 10) => {
    const breeders = await AnimalGeneticProfile.find({
      farm: farmId,
      'breedingProfile.isBreeder': true,
      'breedingProfile.breedingEligibility': 'eligible',
    })
      .populate({
        path: 'animal',
        select: 'tagNumber name gender breed animalType',
        populate: {
          path: 'animalType',
          select: 'name',
        },
      })
      .sort({ 'performanceMetrics.offspringSurvivalRate': -1 })
      .limit(limit)
      .lean();
    
    return breeders.map(breeder => ({
      animal: breeder.animal,
      performance: breeder.performanceMetrics,
      traits: breeder.traits,
      breedingScore: geneticsService.calculateBreedingScore(breeder),
    }));
  },

  // Calculate overall breeding score
  calculateBreedingScore: (profile) => {
    const weights = {
      offspringSurvivalRate: 0.3,
      fertility: 0.2,
      growthRate: 0.2,
      inbreedingCoefficient: 0.1, // Lower is better
      ageFactor: 0.2, // Prime breeding age is best
    };
    
    // Normalize scores
    const survivalScore = profile.performanceMetrics.offspringSurvivalRate || 0;
    const fertilityScore = profile.traits.fertility * 10;
    const growthScore = profile.traits.growthRate * 10;
    const inbreedingScore = (1 - profile.inbreedingCoefficient) * 100;
    
    // Age factor (peak breeding age 2-5 years, simplified)
    let ageScore = 50;
    const animalAge = profile.breedingProfile.firstBreedingAge || 365;
    if (animalAge >= 365 && animalAge <= 1825) { // 1-5 years
      ageScore = 100;
    } else if (animalAge > 1825) { // >5 years
      ageScore = Math.max(0, 100 - (animalAge - 1825) / 365 * 10);
    }
    
    const totalScore = 
      survivalScore * weights.offspringSurvivalRate +
      fertilityScore * weights.fertility +
      growthScore * weights.growthRate +
      inbreedingScore * weights.inbreedingCoefficient +
      ageScore * weights.ageFactor;
    
    return Math.round(totalScore);
  },

  // Get breeding pair suggestions
  getBreedingPairSuggestions: async (farmId, criteria = {}) => {
    const { 
      minCompatibility = 70,
      limit = 5,
      animalType = null,
      gender = null,
    } = criteria;
    
    // Get all eligible breeders
    const breeders = await AnimalGeneticProfile.find({
      farm: farmId,
      'breedingProfile.isBreeder': true,
      'breedingProfile.breedingEligibility': 'eligible',
    })
      .populate({
        path: 'animal',
        match: {
          ...(animalType && { animalType }),
          ...(gender && { gender }),
        },
        select: 'tagNumber name gender breed animalType',
      })
      .lean();
    
    // Filter out null animals (from population)
    const validBreeders = breeders.filter(b => b.animal);
    
    const suggestions = [];
    
    // Find compatible pairs
    for (let i = 0; i < validBreeders.length; i++) {
      for (let j = i + 1; j < validBreeders.length; j++) {
        const breeder1 = validBreeders[i];
        const breeder2 = validBreeders[j];
        
        // Skip same gender
        if (breeder1.animal.gender === breeder2.animal.gender) continue;
        
        // Check compatibility
        const compatibility = breeder1.canBreedWith(breeder2);
        
        if (compatibility.compatibilityScore >= minCompatibility) {
          suggestions.push({
            pair: [breeder1.animal, breeder2.animal],
            compatibilityScore: compatibility.compatibilityScore,
            warnings: compatibility.warnings,
            expectedBenefits: geneticsService.calculateExpectedBenefits(breeder1, breeder2),
          });
        }
      }
    }
    
    // Sort by compatibility score
    suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    return suggestions.slice(0, limit);
  },
};

module.exports = geneticsService;