// src/modules/animals/operations/reproductions/matingEvent.model.js
const mongoose = require('mongoose');

const matingEventSchema = new mongoose.Schema(
  {
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Male (sire) reference
    sire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Sire (male) reference is required'],
    },
    
    // Female(s) (dam) reference - can be multiple for some species
    dams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'At least one dam (female) is required'],
    }],
    
    // Mating details
    matingType: {
      type: String,
      enum: ['natural', 'artificial_insemination', 'hand_mating', 'pasture_mating'],
      default: 'natural',
    },
    
    matingDate: {
      type: Date,
      required: [true, 'Mating date is required'],
    },
    
    expectedConceptionDate: Date,
    
    // Breeding method details
    semenSource: {
      type: String,
      enum: ['on_farm', 'purchased', 'rented', null],
    },
    
    semenBatchNumber: String,
    
    technician: {
      name: String,
      contact: String,
      notes: String,
    },
    
    // Status
    status: {
      type: String,
      enum: ['planned', 'completed', 'failed', 'cancelled'],
      default: 'planned',
    },
    
    outcome: {
      type: String,
      enum: ['successful', 'unsuccessful', 'unknown', null],
    },
    
    outcomeDate: Date,
    
    // Pregnancy checks
    pregnancyCheckDate: Date,
    
    pregnancyResult: {
      type: String,
      enum: ['positive', 'negative', 'unknown', null],
    },
    
    pregnancyCheckMethod: {
      type: String,
      enum: ['ultrasound', 'palpation', 'blood_test', 'observation', null],
    },
    
    // Notes
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    
    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Cost tracking
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
      description: String,
    },
    
    // Flags
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // For tracking multiple matings (repeat services)
    isRepeatService: {
      type: Boolean,
      default: false,
    },
    
    previousMatingEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatingEvent',
    },
    
    // For AI tracking
    strawNumber: String,
    aiCompany: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
matingEventSchema.index({ farm: 1, status: 1 });
matingEventSchema.index({ sire: 1, matingDate: -1 });
matingEventSchema.index({ dams: 1 });
matingEventSchema.index({ matingDate: -1 });

// Virtual for gestation period based on species (will be implemented in service)
matingEventSchema.virtual('gestationDays').get(function() {
  // This will be calculated based on animal type
  return null;
});

// Virtual for expected delivery date
matingEventSchema.virtual('expectedDeliveryDate').get(function() {
  if (!this.expectedConceptionDate) return null;
  // This will be calculated based on species gestation period
  return null;
});

// Method to check if mating can result in pregnancy (based on species rules)
matingEventSchema.methods.canResultInPregnancy = async function() {
  const Animal = require('../../animalRecords/animal.model');
  const AnimalType = require('../../../animalTypes/animalType.model');
  
  // Check sire
  const sire = await Animal.findById(this.sire).populate('animalType');
  if (!sire || sire.gender !== 'male') return false;
  
  // Check at least one dam
  if (this.dams.length === 0) return false;
  
  // Check dams are female
  for (const damId of this.dams) {
    const dam = await Animal.findById(damId);
    if (!dam || dam.gender !== 'female') return false;
    
    // Check if dam is of breeding age and not pregnant already
    const damType = await AnimalType.findById(dam.animalType);
    if (damType) {
      // Check breeding age (simplified)
      const damAgeInDays = (new Date() - new Date(dam.dateOfBirth)) / (1000 * 60 * 60 * 24);
      if (damAgeInDays < (damType.breedingAgeMonths || 6) * 30) {
        return false;
      }
    }
  }
  
  return true;
};

const MatingEvent = mongoose.model('MatingEvent', matingEventSchema);

module.exports = MatingEvent;