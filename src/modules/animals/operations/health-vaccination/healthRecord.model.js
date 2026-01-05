// src/modules/animals/operations/health-vaccination/healthRecord.model.js
const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema(
  {
    // Animal reference
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Animal reference is required'],
    },
    
    // Farm reference (for permission checking)
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Record details
    recordType: {
      type: String,
      required: [true, 'Record type is required'],
      enum: ['illness', 'injury', 'treatment', 'checkup', 'observation', 'death'],
      default: 'illness',
    },
    
    // Diagnosis/Condition
    condition: {
      type: String,
      required: [true, 'Condition/diagnosis is required'],
      trim: true,
      maxlength: [200, 'Condition cannot exceed 200 characters'],
    },
    
    symptoms: [{
      type: String,
      trim: true,
    }],
    
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical'],
      default: 'moderate',
    },
    
    // Treatment details
    treatment: {
      type: String,
      trim: true,
      maxlength: [500, 'Treatment description cannot exceed 500 characters'],
    },
    
    medications: [{
      name: {
        type: String,
        trim: true,
        required: [true, 'Medication name is required'],
      },
      dosage: {
        value: Number,
        unit: String, // mg, ml, etc.
        frequency: String, // daily, twice daily, etc.
      },
      startDate: Date,
      endDate: Date,
      notes: String,
    }],
    
    // Death details (if applicable)
    causeOfDeath: {
      type: String,
      trim: true,
      enum: ['disease', 'injury', 'old_age', 'predation', 'accident', 'other'],
    },
    
    deathDetails: {
      type: String,
      trim: true,
    },
    
    deathDate: {
      type: Date,
    },
    
    // Timeline
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    
    endDate: {
      type: Date,
    },
    
    // Status
    status: {
      type: String,
      enum: ['ongoing', 'resolved', 'fatal'],
      default: 'ongoing',
    },
    
    isRecurring: {
      type: Boolean,
      default: false,
    },
    
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    
    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    veterinarian: {
      name: String,
      contact: String,
      clinic: String,
    },
    
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
      description: String,
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    
    attachments: [{
      filename: String,
      url: String,
      type: String,
      uploadedAt: Date,
    }],
    
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
    
    // For alerts
    lastAlertSent: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
healthRecordSchema.index({ animal: 1, status: 1 });
healthRecordSchema.index({ farm: 1, status: 1 });
healthRecordSchema.index({ status: 1, requiresFollowup: 1 });
healthRecordSchema.index({ animal: 1, startDate: -1 });

// Virtual for duration in days
healthRecordSchema.virtual('durationDays').get(function() {
  if (!this.endDate) return null;
  const diffTime = Math.abs(this.endDate - this.startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Middleware to update animal health status when health record changes
healthRecordSchema.post('save', async function(doc) {
  try {
    const Animal = require('../../animalRecords/animal.model');
    const animal = await Animal.findById(doc.animal);
    
    if (animal) {
      // Count ongoing health issues
      const ongoingIssues = await mongoose.model('HealthRecord').countDocuments({
        animal: doc.animal,
        status: 'ongoing',
        recordType: { $in: ['illness', 'injury'] }
      });
      
      // Update animal health status
      if (ongoingIssues > 0) {
        animal.healthStatus = 'poor';
      } else if (doc.status === 'fatal') {
        animal.healthStatus = 'deceased';
        animal.status = 'deceased';
        animal.dateOfDeath = doc.deathDate || new Date();
      } else {
        // Check if there were any recent issues (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentIssues = await mongoose.model('HealthRecord').countDocuments({
          animal: doc.animal,
          endDate: { $gte: thirtyDaysAgo },
          recordType: { $in: ['illness', 'injury'] }
        });
        
        animal.healthStatus = recentIssues > 0 ? 'fair' : 'good';
      }
      
      await animal.save();
    }
  } catch (error) {
    console.error('Error updating animal health status:', error);
  }
});

const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);

module.exports = HealthRecord;