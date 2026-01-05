// src/modules/animals/operations/reproductions/birthEvent.model.js
const mongoose = require('mongoose');

const birthEventSchema = new mongoose.Schema(
  {
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Pregnancy reference
    pregnancy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pregnancy',
      required: [true, 'Pregnancy reference is required'],
    },
    
    // Parent references
    dam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Dam (mother) reference is required'],
    },
    
    sire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Sire (father) reference is required'],
    },
    
    // Birth details
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required'],
    },
    
    birthTime: String,
    
    location: {
      type: String,
      trim: true,
    },
    
    assistedBirth: {
      type: Boolean,
      default: false,
    },
    
    assistanceType: {
      type: String,
      enum: ['none', 'manual', 'instrumental', 'veterinary', null],
    },
    
    // Offspring statistics
    totalOffspring: {
      type: Number,
      required: [true, 'Total offspring count is required'],
      min: 0,
    },
    
    liveBirths: {
      type: Number,
      required: [true, 'Live births count is required'],
      min: 0,
    },
    
    stillbirths: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    weakOffspring: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    maleOffspring: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    femaleOffspring: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Offspring details (will be populated with Animal records)
    offspring: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    }],
    
    // Complications
    complications: {
      dam: {
        type: String,
        trim: true,
      },
      offspring: {
        type: String,
        trim: true,
      },
    },
    
    veterinaryAssistance: {
      required: Boolean,
      veterinarian: String,
      procedures: String,
      cost: {
        amount: Number,
        currency: {
          type: String,
          default: 'KSH',
          uppercase: true,
        },
      },
    },
    
    // Mortality tracking (for early deaths)
    neonatalDeaths: [{
      offspringId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Animal',
      },
      deathDate: Date,
      cause: String,
      notes: String,
    }],
    
    // Status
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'partial_success', 'failed'],
      default: 'in_progress',
    },
    
    completionDate: Date,
    
    // Notes
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    
    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Flags
    isActive: {
      type: Boolean,
      default: true,
    },
    
    requiresFollowup: {
      type: Boolean,
      default: false,
    },
    
    followupDate: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
birthEventSchema.index({ dam: 1, birthDate: -1 });
birthEventSchema.index({ sire: 1 });
birthEventSchema.index({ farm: 1, birthDate: -1 });
birthEventSchema.index({ pregnancy: 1 });

// Virtuals
birthEventSchema.virtual('successRate').get(function() {
  if (this.totalOffspring === 0) return 0;
  return (this.liveBirths / this.totalOffspring) * 100;
});

birthEventSchema.virtual('stillbirthRate').get(function() {
  if (this.totalOffspring === 0) return 0;
  return (this.stillbirths / this.totalOffspring) * 100;
});

birthEventSchema.virtual('genderRatio').get(function() {
  const total = this.maleOffspring + this.femaleOffspring;
  if (total === 0) return { male: 0, female: 0 };
  return {
    male: (this.maleOffspring / total) * 100,
    female: (this.femaleOffspring / total) * 100,
  };
});

birthEventSchema.virtual('survivalRate').get(function() {
  const totalAlive = this.offspring ? this.offspring.length : 0;
  if (this.liveBirths === 0) return 0;
  return (totalAlive / this.liveBirths) * 100;
});

// Methods
birthEventSchema.methods.updateStatistics = function() {
  // Update statistics based on offspring
  if (this.offspring && this.offspring.length > 0) {
    // This would be called after offspring are created
    // Count males and females from offspring records
  }
  return this;
};

const BirthEvent = mongoose.model('BirthEvent', birthEventSchema);

module.exports = BirthEvent;