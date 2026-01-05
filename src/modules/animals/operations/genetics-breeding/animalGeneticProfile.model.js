const mongoose = require('mongoose');

const animalGeneticProfileSchema = new mongoose.Schema(
  {
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
      unique: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
    
    // Lineage Information (derived from existing parent references)
    sire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    dam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    
    // Breeding Profile (computed, not manually entered)
    breedingProfile: {
      isBreeder: {
        type: Boolean,
        default: false,
      },
      breedingEligibility: {
        type: String,
        enum: ['eligible', 'ineligible', 'restricted'],
        default: 'eligible',
      },
      ageAtMaturity: Date, // When animal became mature enough to breed
      firstBreedingAge: Number, // Age in days at first breeding
      lastBreedingDate: Date,
      breedingSeason: {
        type: String,
        enum: ['year-round', 'seasonal', 'unknown'],
        default: 'unknown',
      },
    },
    
    // Performance Metrics (computed from reproduction data)
    performanceMetrics: {
      // For males
      totalMatings: {
        type: Number,
        default: 0,
      },
      successfulMatings: {
        type: Number,
        default: 0,
      },
      matingSuccessRate: {
        type: Number,
        default: 0,
      }, // percentage
      
      // For females
      totalPregnancies: {
        type: Number,
        default: 0,
      },
      successfulPregnancies: {
        type: Number,
        default: 0,
      },
      pregnancySuccessRate: {
        type: Number,
        default: 0,
      },
      
      totalOffspring: {
        type: Number,
        default: 0,
      },
      liveOffspring: {
        type: Number,
        default: 0,
      },
      offspringSurvivalRate: {
        type: Number,
        default: 0,
      },
      
      averageLitterSize: {
        type: Number,
        default: 0,
      },
      averageGestationDays: {
        type: Number,
        default: 0,
      },
    },
    
    // Traits (lightweight - based on performance)
    traits: {
      // Growth traits
      growthRate: {
        type: Number,
        min: 0,
        max: 10,
        default: 5,
      }, // 1-10 scale
      
      // Reproductive traits
      fertility: {
        type: Number,
        min: 0,
        max: 10,
        default: 5,
      },
      litterSizePotential: {
        type: Number,
        min: 0,
        max: 10,
        default: 5,
      },
      
      // Survival traits
      offspringViability: {
        type: Number,
        min: 0,
        max: 10,
        default: 5,
      },
      
      // Temperament (optional)
      temperament: {
        type: String,
        enum: ['docile', 'normal', 'aggressive', null],
        default: null,
      },
      
      // Custom traits per animal type
      customTraits: [
        {
          name: String,
          value: mongoose.Schema.Types.Mixed,
          unit: String,
        },
      ],
    },
    
    // Inbreeding Awareness
    inbreedingCoefficient: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    }, // 0-1 scale (0 = no inbreeding, 1 = maximum)
    
    knownCloseRelatives: [
      {
        animal: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Animal',
        },
        relationship: {
          type: String,
          enum: ['parent', 'offspring', 'full_sibling', 'half_sibling', 'grandparent', 'grandchild', 'cousin'],
        },
        coefficient: Number, // Relatedness coefficient (0-1)
      },
    ],
    
    // Breeding Recommendations (computed)
    breedingRecommendations: {
      recommendedPairs: [
        {
          animal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Animal',
          },
          compatibilityScore: Number, // 0-100
          expectedBenefits: [String], // e.g., "Improved growth rate", "Reduced inbreeding"
          warnings: [String], // e.g., "Close relatives", "Similar weak traits"
        },
      ],
      avoidPairs: [
        {
          animal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Animal',
          },
          reason: String,
          severity: {
            type: String,
            enum: ['high', 'medium', 'low'],
          },
        },
      ],
    },
    
    // Pedigree Information (cached for quick access)
    pedigree: {
      generation: {
        type: Number,
        default: 1,
      },
      ancestors: [
        {
          animal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Animal',
          },
          relationship: String,
          generation: Number,
        },
      ],
    },
    
    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
animalGeneticProfileSchema.index({ animal: 1 }, { unique: true });
animalGeneticProfileSchema.index({ farm: 1, 'breedingProfile.isBreeder': 1 });
animalGeneticProfileSchema.index({ farm: 1, 'traits.growthRate': 1 });
animalGeneticProfileSchema.index({ farm: 1, 'performanceMetrics.offspringSurvivalRate': -1 });

// Static method to compute relationship coefficient
animalGeneticProfileSchema.statics.calculateRelationshipCoefficient = function(relationship) {
  const coefficients = {
    'parent': 0.5,
    'offspring': 0.5,
    'full_sibling': 0.5,
    'half_sibling': 0.25,
    'grandparent': 0.25,
    'grandchild': 0.25,
    'cousin': 0.125,
  };
  
  return coefficients[relationship] || 0;
};

// Method to check if breeding is advisable
animalGeneticProfileSchema.methods.canBreedWith = function(otherProfile) {
  const warnings = [];
  let canBreed = true;
  
  // Check for close relatives
  const closeRelative = this.knownCloseRelatives.find(
    rel => rel.animal.toString() === otherProfile.animal.toString()
  );
  
  if (closeRelative) {
    if (['parent', 'offspring', 'full_sibling'].includes(closeRelative.relationship)) {
      warnings.push(`High inbreeding risk: ${closeRelative.relationship}`);
      canBreed = false;
    } else if (['half_sibling', 'grandparent', 'grandchild'].includes(closeRelative.relationship)) {
      warnings.push(`Medium inbreeding risk: ${closeRelative.relationship}`);
    }
  }
  
  // Check if both are breeders
  if (!this.breedingProfile.isBreeder || !otherProfile.breedingProfile.isBreeder) {
    warnings.push('One or both animals are not designated as breeders');
    canBreed = false;
  }
  
  return {
    canBreed,
    warnings,
    compatibilityScore: this.calculateCompatibilityScore(otherProfile),
  };
};

// Method to calculate compatibility score
animalGeneticProfileSchema.methods.calculateCompatibilityScore = function(otherProfile) {
  let score = 50; // Base score
  
  // Adjust based on inbreeding coefficient
  const combinedInbreeding = (this.inbreedingCoefficient + otherProfile.inbreedingCoefficient) / 2;
  score -= combinedInbreeding * 30;
  
  // Adjust based on complementary traits
  const traitDifference = Math.abs(this.traits.growthRate - otherProfile.traits.growthRate);
  score += (10 - traitDifference) * 2; // More difference = more diversity
  
  // Adjust based on performance
  const avgSurvivalRate = (this.performanceMetrics.offspringSurvivalRate + 
                          otherProfile.performanceMetrics.offspringSurvivalRate) / 2;
  score += avgSurvivalRate / 2;
  
  return Math.max(0, Math.min(100, Math.round(score)));
};

const AnimalGeneticProfile = mongoose.model('AnimalGeneticProfile', animalGeneticProfileSchema);

module.exports = AnimalGeneticProfile;