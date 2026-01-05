// src/modules/animals/animalRecords/animal.model.js
const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
  {
    // Basic Identity
    tagNumber: {
      type: String,
      required: [true, 'Tag number is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['male', 'female', 'unknown'],
      default: 'unknown',
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    dateOfEntry: {
      type: Date,
      default: Date.now,
    },

    // Physical Attributes
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg',
      },
      lastUpdated: Date,
    },
    color: String,
    breed: String,

    // Parentage
    mother: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    father: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },

    // Reproduction & pedigree fields
    reproductiveStatus: {
      type: String,
      enum: ['immature', 'open', 'pregnant', 'lactating', 'dry', 'infertile', null],
      default: null,
    },

    // For females
    lastHeatDate: Date,
    heatCycleDays: Number,
    lastBirthDate: Date,
    totalBirths: {
      type: Number,
      default: 0,
    },

    // For males
    breedingStatus: {
      type: String,
      enum: ['active', 'retired', 'infertile', null],
      default: null,
    },

    // Parent references (alternative naming)
    sire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    dam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },

    // Birth event reference
    birthEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BirthEvent',
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['alive', 'deceased', 'sold', 'transferred', 'archived'],
      default: 'alive',
    },
    statusDate: {
      type: Date,
      default: Date.now,
    },
    statusReason: String,

    // Medical
    healthStatus: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
      default: 'good',
    },
    lastHealthCheck: Date,

    // Hierarchy References
    animalType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnimalType',
      required: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },

    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: String,

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
animalSchema.index({ farm: 1, tagNumber: 1 }, { unique: true });

// Static method to generate next tag number
animalSchema.statics.generateTagNumber = async function (farmId, prefix = 'AN') {
  const count = await this.countDocuments({ farm: farmId });
  const paddedCount = String(count + 1).padStart(4, '0');
  return `${prefix}${paddedCount}`;
};

const Animal = mongoose.model('Animal', animalSchema);

module.exports = Animal;