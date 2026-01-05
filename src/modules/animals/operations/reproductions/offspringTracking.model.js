// src/modules/animals/operations/reproductions/offspringTracking.model.js
const mongoose = require('mongoose');

const offspringTrackingSchema = new mongoose.Schema(
  {
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Birth event reference
    birthEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BirthEvent',
      required: [true, 'Birth event reference is required'],
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
    
    // Offspring reference (the actual Animal record)
    offspring: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Offspring animal reference is required'],
    },
    
    // Offspring details (cached for performance)
    offspringDetails: {
      tagNumber: String,
      name: String,
      gender: {
        type: String,
        enum: ['male', 'female', 'unknown'],
      },
      breed: String,
      dateOfBirth: Date,
    },
    
    // Lifecycle tracking
    birthWeight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb'],
        default: 'kg',
      },
    },
    
    weaningDate: Date,
    
    weaningWeight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb'],
        default: 'kg',
      },
    },
    
    // Health tracking
    neonatalHealth: {
      status: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'critical'],
        default: 'good',
      },
      issues: [{
        date: Date,
        type: String,
        description: String,
        treatment: String,
        resolved: Boolean,
      }],
    },
    
    // Status
    status: {
      type: String,
      enum: ['alive', 'weaned', 'sold', 'died', 'transferred', 'culled'],
      default: 'alive',
    },
    
    statusDate: Date,
    
    // Sale/transfer details (if applicable)
    saleDetails: {
      date: Date,
      price: {
        amount: Number,
        currency: {
          type: String,
          default: 'KSH',
          uppercase: true,
        },
      },
      buyer: String,
      contact: String,
    },
    
    // Death details (if applicable)
    deathDetails: {
      date: Date,
      cause: {
        type: String,
        enum: ['disease', 'accident', 'predation', 'congenital', 'other'],
      },
      notes: String,
    },
    
    // Culling details (if applicable)
    cullingDetails: {
      date: Date,
      reason: String,
      notes: String,
    },
    
    // Growth tracking
    growthMeasurements: [{
      date: Date,
      weight: {
        value: Number,
        unit: String,
      },
      height: {
        value: Number,
        unit: String,
      },
      notes: String,
    }],
    
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
    
    // Flags
    isActive: {
      type: Boolean,
      default: true,
    },
    
    requiresSpecialAttention: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
offspringTrackingSchema.index({ offspring: 1 });
offspringTrackingSchema.index({ dam: 1 });
offspringTrackingSchema.index({ sire: 1 });
offspringTrackingSchema.index({ birthEvent: 1 });
offspringTrackingSchema.index({ farm: 1, status: 1 });

// Virtuals
offspringTrackingSchema.virtual('ageInDays').get(function() {
  if (!this.offspringDetails?.dateOfBirth) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.offspringDetails.dateOfBirth);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

offspringTrackingSchema.virtual('isWeaned').get(function() {
  return this.weaningDate !== undefined && this.weaningDate !== null;
});

offspringTrackingSchema.virtual('currentWeight').get(function() {
  if (!this.growthMeasurements || this.growthMeasurements.length === 0) {
    return null;
  }
  // Get the most recent weight measurement
  const sorted = [...this.growthMeasurements].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted[0].weight;
});

// Methods
offspringTrackingSchema.methods.updateOffspringDetails = async function() {
  const Animal = require('../../animalRecords/animal.model');
  const animal = await Animal.findById(this.offspring);
  
  if (animal) {
    this.offspringDetails = {
      tagNumber: animal.tagNumber,
      name: animal.name,
      gender: animal.gender,
      breed: animal.breed,
      dateOfBirth: animal.dateOfBirth,
    };
    await this.save();
  }
  
  return this;
};

// REMOVE THE PROBLEMATIC MIDDLEWARE
// offspringTrackingSchema.pre('save', async function(next) {
//   // If offspring is being marked as died, update the animal record
//   if (this.isModified('status') && this.status === 'died' && this.deathDetails) {
//     const Animal = require('../../animalRecords/animal.model');
//     await Animal.findByIdAndUpdate(this.offspring, {
//       status: 'deceased',
//       dateOfDeath: this.deathDetails.date,
//     });
//   }
//   
//   // If offspring is being weaned, update weaning date if not set
//   if (this.isModified('status') && this.status === 'weaned' && !this.weaningDate) {
//     this.weaningDate = new Date();
//   }
//   
//   next();
// });

const OffspringTracking = mongoose.model('OffspringTracking', offspringTrackingSchema);

module.exports = OffspringTracking;