// src/modules/animals/operations/health-vaccination/vaccinationRecord.model.js
const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema(
  {
    // Animal reference
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Animal reference is required'],
    },
    
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Vaccine details
    vaccineName: {
      type: String,
      required: [true, 'Vaccine name is required'],
      trim: true,
      maxlength: [100, 'Vaccine name cannot exceed 100 characters'],
    },
    
    vaccineType: {
      type: String,
      enum: ['core', 'non_core', 'optional', 'custom'],
      default: 'core',
    },
    
    // Administration details
    doseNumber: {
      type: Number,
      required: [true, 'Dose number is required'],
      min: 1,
    },
    
    totalDoses: {
      type: Number,
      min: 1,
    },
    
    dateAdministered: {
      type: Date,
      required: [true, 'Date administered is required'],
    },
    
    nextDueDate: {
      type: Date,
    },
    
    // Batch/Lot details
    batchNumber: {
      type: String,
      trim: true,
    },
    
    manufacturer: {
      type: String,
      trim: true,
    },
    
    expirationDate: {
      type: Date,
    },
    
    // Administration details
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    veterinarian: {
      name: String,
      contact: String,
      clinic: String,
    },
    
    administrationRoute: {
      type: String,
      enum: ['injection', 'oral', 'nasal', 'topical', 'other'],
      default: 'injection',
    },
    
    administrationSite: {
      type: String,
      trim: true,
    },
    
    // Cost
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
    },
    
    // Reactions/Notes
    reaction: {
      type: String,
      trim: true,
      enum: ['none', 'mild', 'moderate', 'severe', null],
    },
    
    reactionNotes: {
      type: String,
      trim: true,
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // For alerts
    reminderSent: {
      type: Boolean,
      default: false,
    },
    
    lastReminderSent: Date,
    
    // Metadata
    attachments: [{
      filename: String,
      url: String,
      type: String,
      uploadedAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
vaccinationRecordSchema.index({ animal: 1, vaccineName: 1 });
vaccinationRecordSchema.index({ farm: 1, nextDueDate: 1 });
vaccinationRecordSchema.index({ animal: 1, dateAdministered: -1 });
vaccinationRecordSchema.index({ nextDueDate: 1, reminderSent: 1 });

// Virtual for vaccination status
vaccinationRecordSchema.virtual('status').get(function() {
  if (!this.nextDueDate) return 'completed';
  
  const now = new Date();
  const dueInDays = Math.ceil((this.nextDueDate - now) / (1000 * 60 * 60 * 24));
  
  if (dueInDays <= 0) return 'overdue';
  if (dueInDays <= 7) return 'due_soon';
  return 'up_to_date';
});

// Method to check if vaccination is due
vaccinationRecordSchema.methods.isDue = function() {
  if (!this.nextDueDate) return false;
  const now = new Date();
  return now >= this.nextDueDate;
};

// Method to check if vaccination is due soon (within 7 days)
vaccinationRecordSchema.methods.isDueSoon = function() {
  if (!this.nextDueDate) return false;
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return this.nextDueDate <= sevenDaysFromNow && this.nextDueDate > now;
};

const VaccinationRecord = mongoose.model('VaccinationRecord', vaccinationRecordSchema);

module.exports = VaccinationRecord;