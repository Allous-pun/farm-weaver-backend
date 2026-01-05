// src/modules/animals/operations/feeds/feed.model.js
const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema(
  {
    // Core Reference
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Animal reference is required'],
    },
    
    // Feed Details
    feedType: {
      type: String,
      required: [true, 'Feed type is required'],
      trim: true,
      enum: ['pellets', 'hay', 'mash', 'grains', 'supplements', 'custom', 'other'],
      default: 'pellets',
    },
    
    customFeedName: {
      type: String,
      trim: true,
    },
    
    quantity: {
      value: {
        type: Number,
        required: [true, 'Quantity value is required'],
        min: [0.001, 'Quantity must be greater than 0'],
      },
      unit: {
        type: String,
        required: [true, 'Quantity unit is required'],
        enum: ['kg', 'g', 'lb', 'oz', 'liters', 'ml', 'units'],
        default: 'kg',
      },
    },
    
    // Timing
    feedingTime: {
      type: Date,
      required: [true, 'Feeding time is required'],
      default: Date.now,
    },
    
    scheduleType: {
      type: String,
      enum: ['regular', 'scheduled', 'extra', 'medical', 'other'],
      default: 'regular',
    },
    
    // Cost & Notes
    cost: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    
    // Status
    isCompleted: {
      type: Boolean,
      default: true,
    },
    
    isMissed: {
      type: Boolean,
      default: false,
    },
    
    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
feedSchema.index({ animal: 1, feedingTime: -1 });
feedSchema.index({ farm: 1, feedingTime: -1 });
feedSchema.index({ animal: 1, feedType: 1 });

const Feed = mongoose.model('Feed', feedSchema);

module.exports = Feed;