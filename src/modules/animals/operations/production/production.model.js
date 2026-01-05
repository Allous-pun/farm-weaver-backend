const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema(
  {
    // Production Identity
    productionType: {
      type: String,
      required: true,
      enum: [
        'milk',
        'eggs', 
        'wool',
        'honey',
        'manure',
        'hair_fiber',
        'semen', // Optional, for breeding operations
        'other'
      ],
    },
    
    // Animal Reference
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
    },
    
    // Farm Reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
    
    // Animal Type Reference
    animalType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnimalType',
      required: true,
    },
    
    // Production Details
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['liter', 'gallon', 'dozen', 'piece', 'kg', 'lb', 'gram', 'ounce', 'ml'],
    },
    
    // Time Information
    productionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    productionTime: String, // Optional: "morning", "evening", "specific time"
    
    // Quality Metrics (type-specific)
    qualityMetrics: {
      // For milk
      fatContent: {
        type: Number,
        min: 0,
        max: 100,
      }, // percentage
      proteinContent: {
        type: Number,
        min: 0,
        max: 100,
      },
      somaticCellCount: Number,
      
      // For eggs
      weight: Number, // grams
      shellQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
      yolkColor: {
        type: String,
        enum: ['pale', 'light', 'medium', 'dark', 'deep'],
      },
      
      // For wool/hair
      fiberDiameter: Number, // microns
      stapleLength: Number, // cm
      color: String,
      
      // For honey
      moistureContent: {
        type: Number,
        min: 0,
        max: 100,
      },
      colorGrade: {
        type: String,
        enum: ['water_white', 'extra_white', 'white', 'extra_light_amber', 'light_amber', 'amber'],
      },
      
      // For manure
      moisture: {
        type: Number,
        min: 0,
        max: 100,
      },
      nitrogenContent: Number,
      phosphorusContent: Number,
      potassiumContent: Number,
      
      // General quality
      grade: {
        type: String,
        enum: ['premium', 'standard', 'commercial', 'feed_grade', 'unusable'],
        default: 'standard',
      },
    },
    
    // Production Context
    lactationNumber: {
      type: Number,
      min: 1,
    }, // For dairy animals
    lactationDay: {
      type: Number,
      min: 1,
    },
    collectionMethod: {
      type: String,
      enum: ['manual', 'machine', 'natural', 'assisted'],
      default: 'manual',
    },
    
    // Health Snapshot (at time of production)
    healthAtProduction: {
      healthStatus: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
      },
      bodyConditionScore: {
        type: Number,
        min: 1,
        max: 5,
      },
      temperature: Number,
      notes: String,
    },
    
    // Feed & Nutrition Snapshot (optional)
    feedAtProduction: {
      feedType: String,
      quantityFed: Number,
      feedingTime: String,
    },
    
    // Environmental Factors (optional)
    environment: {
      temperature: Number,
      humidity: Number,
      weatherConditions: String,
    },
    
    // Batch Information (for group/coop production)
    batchId: String,
    batchName: String,
    isBatchProduction: {
      type: Boolean,
      default: false,
    },
    
    // Status
    status: {
      type: String,
      enum: ['recorded', 'processed', 'discarded', 'converted'],
      default: 'recorded',
    },
    
    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,
    
    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
productionSchema.index({ farm: 1, animal: 1, productionDate: -1 });
productionSchema.index({ farm: 1, productionType: 1, productionDate: -1 });
productionSchema.index({ farm: 1, animalType: 1, productionDate: -1 });
productionSchema.index({ farm: 1, 'qualityMetrics.grade': 1 });
productionSchema.index({ animal: 1, productionDate: -1 });

// Virtual for production value (if unit price is known)
productionSchema.virtual('productionValue').get(function() {
  // This would be calculated based on product pricing
  // For now, return null - pricing belongs to inventory/sales
  return null;
});

// Method to check if production is recent
productionSchema.methods.isRecent = function(hours = 24) {
  const now = new Date();
  const productionTime = new Date(this.productionDate);
  const hoursDiff = (now - productionTime) / (1000 * 60 * 60);
  return hoursDiff <= hours;
};

// Method to get production quality summary
productionSchema.methods.getQualitySummary = function() {
  const summary = {
    grade: this.qualityMetrics.grade || 'standard',
    issues: [],
    strengths: [],
  };
  
  // Type-specific quality checks
  switch (this.productionType) {
    case 'milk':
      if (this.qualityMetrics.fatContent < 3.0) {
        summary.issues.push('Low fat content');
      }
      if (this.qualityMetrics.fatContent > 5.0) {
        summary.strengths.push('High fat content');
      }
      if (this.qualityMetrics.somaticCellCount > 200000) {
        summary.issues.push('High somatic cell count');
      }
      break;
      
    case 'eggs':
      if (this.qualityMetrics.weight < 50) {
        summary.issues.push('Small egg size');
      }
      if (this.qualityMetrics.shellQuality === 'poor') {
        summary.issues.push('Poor shell quality');
      }
      break;
      
    case 'wool':
      if (this.qualityMetrics.fiberDiameter > 25) {
        summary.issues.push('Coarse fiber');
      }
      if (this.qualityMetrics.stapleLength < 5) {
        summary.issues.push('Short staple length');
      }
      break;
      
    case 'honey':
      if (this.qualityMetrics.moistureContent > 20) {
        summary.issues.push('High moisture content');
      }
      break;
  }
  
  return summary;
};

const Production = mongoose.model('Production', productionSchema);

module.exports = Production;