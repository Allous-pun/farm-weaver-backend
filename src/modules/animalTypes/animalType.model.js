// src/modules/animalTypes/animalType.model.js
const mongoose = require('mongoose');

const animalTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Animal type name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Livestock', 'Poultry', 'Aquatic', 'Other'],
      default: 'Livestock',
    },
    icon: {
      type: String,
      default: '🐄',
    },
    themeColor: {
      type: String,
      default: '#4CAF50',
    },
    measurementUnit: {
      type: String,
      required: [true, 'Measurement unit is required'],
      enum: ['kg', 'lb', 'liters', 'pieces', 'units'],
      default: 'kg',
    },

    // Custom Terminology
    youngName: {
      type: String,
      default: 'Young',
      trim: true,
    },
    maleName: {
      type: String,
      default: 'Male',
      trim: true,
    },
    femaleName: {
      type: String,
      default: 'Female',
      trim: true,
    },
    birthEventName: {
      type: String,
      default: 'Birth',
      trim: true,
    },

    // Feature Flags
    features: {
      feedManagement: {
        type: Boolean,
        default: true,
      },
      healthVaccinations: {
        type: Boolean,
        default: true,
      },
      reproduction: {
        type: Boolean,
        default: false,
      },
      geneticsBreeding: {
        type: Boolean,
        default: false,
      },
      inventorySales: {
        type: Boolean,
        default: false,
      },
      production: {
        type: Boolean,
        default: false,
      },
    },

    // Farm Reference
    // Reproduction-specific configuration
    reproduction: {
      gestationDays: Number,
      breedingAgeMonths: Number,
      breedingWeight: Number,
      litterSize: {
        min: Number,
        max: Number,
        average: Number,
      },
      weaningAgeDays: Number,
      breedingSeason: {
        startMonth: Number, // 0-11 (January = 0)
        endMonth: Number,
      },
    },
    // Genetics & Breeding Settings
    geneticsSettings: {
      enableGenetics: {
        type: Boolean,
        default: false,
      },
      maturityAgeDays: {
        type: Number,
        default: 365, // Days until animal is considered mature
      },
      minBreedingAgeDays: {
        type: Number,
        default: 180, // Minimum age for breeding (days)
      },
      maxBreedingAgeDays: {
        type: Number,
        default: 3650, // Maximum age for breeding (~10 years)
      },
      breedingSeason: {
        type: String,
        enum: ['year-round', 'seasonal', 'spring', 'autumn', 'summer', 'winter'],
        default: 'year-round',
      },
      gestationPeriodDays: {
        type: Number,
        default: 30, // Default for rabbits
      },
      averageLitterSize: {
        type: Number,
        default: 6,
      },
      inbreedingThreshold: {
        type: Number,
        default: 0.25, // Warn when inbreeding coefficient exceeds this
      },
      // Trait weights for breeding decisions
      traitWeights: {
        growthRate: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.3,
        },
        fertility: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.3,
        },
        offspringViability: {
          type: Number,
          min: 0,
          max: 1,
          default: 0.4,
        },
      },
      // Breeding rules
      breedingRules: {
        allowParentOffspringBreeding: {
          type: Boolean,
          default: false,
        },
        allowSiblingBreeding: {
          type: Boolean,
          default: false,
        },
        allowCousinBreeding: {
          type: Boolean,
          default: true,
        },
        requireHealthCheck: {
          type: Boolean,
          default: true,
        },
        minimumOffspringSurvivalRate: {
          type: Number,
          min: 0,
          max: 100,
          default: 70,
        },
      },
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },

    // Status Flags
    isActive: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
animalTypeSchema.index({ farm: 1, isArchived: 1 });

const AnimalType = mongoose.model('AnimalType', animalTypeSchema);

module.exports = AnimalType;