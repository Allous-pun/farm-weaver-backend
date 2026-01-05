// src/modules/animals/operations/feeds/feedSchedule.model.js
const mongoose = require('mongoose');

const feedScheduleSchema = new mongoose.Schema(
  {
    // Reference to animal
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: [true, 'Animal reference is required'],
    },
    
    // Schedule details
    name: {
      type: String,
      required: [true, 'Schedule name is required'],
      trim: true,
    },
    
    description: {
      type: String,
      trim: true,
    },
    
    feedType: {
      type: String,
      required: [true, 'Feed type is required'],
      enum: ['pellets', 'hay', 'mash', 'grains', 'supplements', 'custom', 'other'],
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
    
    // Schedule timing
    frequency: {
      type: String,
      required: [true, 'Frequency is required'],
      enum: ['daily', 'twice_daily', 'weekly', 'custom'],
      default: 'daily',
    },
    
    timesPerDay: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    
    specificTimes: [{
      hour: {
        type: Number,
        min: 0,
        max: 23,
      },
      minute: {
        type: Number,
        min: 0,
        max: 59,
      },
    }],
    
    daysOfWeek: [{
      type: Number,
      min: 0, // 0 = Sunday, 1 = Monday, etc.
      max: 6,
    }],
    
    startDate: {
      type: Date,
      default: Date.now,
    },
    
    endDate: {
      type: Date,
    },
    
    // Cost estimation
    estimatedCostPerFeeding: {
      amount: Number,
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    
    lastGenerated: {
      type: Date,
    },
    
    // Metadata
    createdBy: {
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

// Indexes
feedScheduleSchema.index({ animal: 1, isActive: 1 });
feedScheduleSchema.index({ farm: 1, isActive: 1 });
feedScheduleSchema.index({ nextOccurrence: 1 });

// Method to generate next feedings from schedule
feedScheduleSchema.methods.generateNextFeedings = function(count = 7) {
  const feedings = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const feedingDate = new Date(now);
    
    switch (this.frequency) {
      case 'daily':
        feedingDate.setDate(feedingDate.getDate() + i);
        break;
      case 'twice_daily':
        // Generate morning and evening feedings
        const morningDate = new Date(feedingDate);
        morningDate.setDate(morningDate.getDate() + Math.floor(i / 2));
        morningDate.setHours(8, 0, 0, 0); // 8:00 AM
        
        const eveningDate = new Date(feedingDate);
        eveningDate.setDate(eveningDate.getDate() + Math.floor(i / 2));
        eveningDate.setHours(17, 0, 0, 0); // 5:00 PM
        
        if (i % 2 === 0) {
          feedings.push({
            date: morningDate,
            time: '08:00',
          });
        } else {
          feedings.push({
            date: eveningDate,
            time: '17:00',
          });
        }
        continue;
      case 'weekly':
        if (this.daysOfWeek && this.daysOfWeek.length > 0) {
          const dayIndex = i % this.daysOfWeek.length;
          const targetDay = this.daysOfWeek[dayIndex];
          const currentDay = feedingDate.getDay();
          let daysToAdd = targetDay - currentDay;
          if (daysToAdd < 0) daysToAdd += 7;
          feedingDate.setDate(feedingDate.getDate() + daysToAdd + Math.floor(i / this.daysOfWeek.length) * 7);
        }
        break;
    }
    
    // Add default time if specific times not provided
    if (this.specificTimes && this.specificTimes.length > 0) {
      const timeIndex = i % this.specificTimes.length;
      const time = this.specificTimes[timeIndex];
      feedingDate.setHours(time.hour, time.minute, 0, 0);
    } else {
      feedingDate.setHours(8, 0, 0, 0); // Default to 8:00 AM
    }
    
    feedings.push({
      date: feedingDate,
      time: `${feedingDate.getHours().toString().padStart(2, '0')}:${feedingDate.getMinutes().toString().padStart(2, '0')}`,
    });
  }
  
  return feedings;
};

const FeedSchedule = mongoose.model('FeedSchedule', feedScheduleSchema);

module.exports = FeedSchedule;