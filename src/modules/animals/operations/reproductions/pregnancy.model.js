// src/modules/animals/operations/reproductions/pregnancy.model.js
const mongoose = require('mongoose');

const pregnancySchema = new mongoose.Schema(
  {
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Animal (dam) reference
    dam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Dam (female) reference is required'],
    },
    
    // Sire reference
    sire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Sire (male) reference is required'],
    },
    
    // Mating event reference
    matingEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatingEvent',
      required: [true, 'Mating event reference is required'],
    },
    
    // Pregnancy details
    conceptionDate: {
      type: Date,
      required: [true, 'Conception date is required'],
    },
    
    confirmedDate: {
      type: Date,
      required: [true, 'Pregnancy confirmation date is required'],
    },
    
    confirmedBy: {
      type: String,
      enum: ['farmer', 'veterinarian', 'technician'],
      default: 'farmer',
    },
    
    confirmationMethod: {
      type: String,
      enum: ['ultrasound', 'palpation', 'blood_test', 'observation'],
      default: 'observation',
    },
    
    // Species-specific gestation
    expectedGestationDays: {
      type: Number,
      required: [true, 'Expected gestation days are required'],
      min: 1,
    },
    
    expectedDeliveryDate: {
      type: Date,
      required: [true, 'Expected delivery date is required'],
    },
    
    // Monitoring
    checkups: [{
      date: Date,
      weight: Number,
      notes: String,
      examiner: String,
      findings: String,
    }],
    
    complications: [{
      date: Date,
      type: String,
      description: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe'],
      },
      actionTaken: String,
      resolved: Boolean,
    }],
    
    // Expected litter
    expectedLitterSize: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
    },
    
    // Status
    status: {
      type: String,
      enum: ['confirmed', 'progressing', 'delivered', 'aborted', 'failed'],
      default: 'confirmed',
    },
    
    actualDeliveryDate: Date,
    
    abortionDate: Date,
    
    abortionReason: {
      type: String,
      enum: ['natural', 'medical', 'accident', 'unknown'],
    },
    
    abortionNotes: String,
    
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
    
    requiresSpecialCare: {
      type: Boolean,
      default: false,
    },
    
    specialCareInstructions: String,
    
    // Cost tracking
    veterinaryCost: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
pregnancySchema.index({ dam: 1, status: 1 });
pregnancySchema.index({ sire: 1 });
pregnancySchema.index({ farm: 1, expectedDeliveryDate: 1 });
pregnancySchema.index({ status: 1, expectedDeliveryDate: 1 });

// Virtuals
pregnancySchema.virtual('daysPregnant').get(function() {
  if (!this.conceptionDate) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.conceptionDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

pregnancySchema.virtual('daysRemaining').get(function() {
  if (!this.expectedDeliveryDate) return null;
  const now = new Date();
  const diffTime = Math.abs(this.expectedDeliveryDate - now);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return this.expectedDeliveryDate > now ? days : -days;
});

pregnancySchema.virtual('gestationProgress').get(function() {
  if (!this.expectedGestationDays) return 0;
  const daysPregnant = this.daysPregnant;
  return Math.min(100, Math.floor((daysPregnant / this.expectedGestationDays) * 100));
});

pregnancySchema.virtual('isOverdue').get(function() {
  if (!this.expectedDeliveryDate) return false;
  const now = new Date();
  return now > this.expectedDeliveryDate && this.status === 'progressing';
});

// Methods
pregnancySchema.methods.updateStatus = function() {
  const now = new Date();
  const daysPregnant = this.daysPregnant;
  
  if (this.status === 'confirmed' && daysPregnant > 7) {
    this.status = 'progressing';
  }
  
  // Check if overdue
  if (this.status === 'progressing' && this.isOverdue) {
    // Pregnancy is overdue
  }
  
  return this;
};

// REMOVE THE PROBLEMATIC PRE-SAVE HOOK COMPLETELY
// pregnancySchema.pre('save', function(next) {
//   // Remove this entire middleware
//   next();
// });

const Pregnancy = mongoose.model('Pregnancy', pregnancySchema);

module.exports = Pregnancy;