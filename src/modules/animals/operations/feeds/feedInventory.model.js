// src/modules/animals/operations/feeds/feedInventory.model.js
const mongoose = require('mongoose');

const feedInventorySchema = new mongoose.Schema(
  {
    // Farm reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
    },
    
    // Feed details
    feedType: {
      type: String,
      required: [true, 'Feed type is required'],
      enum: ['pellets', 'hay', 'mash', 'grains', 'supplements', 'custom', 'other'],
    },
    
    customFeedName: {
      type: String,
      trim: true,
    },
    
    brand: {
      type: String,
      trim: true,
    },
    
    // Stock details
    currentStock: {
      value: {
        type: Number,
        required: [true, 'Current stock value is required'],
        min: 0,
      },
      unit: {
        type: String,
        required: [true, 'Stock unit is required'],
        enum: ['kg', 'g', 'lb', 'oz', 'liters', 'ml', 'bags', 'units'],
        default: 'kg',
      },
    },
    
    minimumStockLevel: {
      value: {
        type: Number,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb', 'oz', 'liters', 'ml', 'bags', 'units'],
      },
    },
    
    reorderPoint: {
      value: {
        type: Number,
        min: 0,
      },
      unit: {
        type: String,
        enum: ['kg', 'g', 'lb', 'oz', 'liters', 'ml', 'bags', 'units'],
      },
    },
    
    // Cost details
    purchasePrice: {
      amount: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: 'KSH',
        uppercase: true,
      },
      perUnit: {
        value: Number,
        unit: String,
      },
    },
    
    lastPurchaseDate: Date,
    
    lastPurchaseQuantity: {
      value: Number,
      unit: String,
    },
    
    // Storage details
    storageLocation: {
      type: String,
      trim: true,
    },
    
    expirationDate: Date,
    
    batchNumber: {
      type: String,
      trim: true,
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    
    needsReorder: {
      type: Boolean,
      default: false,
    },
    
    // Metadata
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
feedInventorySchema.index({ farm: 1, feedType: 1 });
feedInventorySchema.index({ farm: 1, needsReorder: 1 });
feedInventorySchema.index({ farm: 1, expirationDate: 1 });

// Method to check if stock is low
feedInventorySchema.methods.checkStockLevel = function() {
  if (this.minimumStockLevel && this.minimumStockLevel.value && this.minimumStockLevel.unit) {
    // Convert both to same unit for comparison (simplified - in real app, implement unit conversion)
    if (this.currentStock.value <= this.minimumStockLevel.value) {
      this.needsReorder = true;
      return 'low';
    } else if (this.reorderPoint && this.currentStock.value <= this.reorderPoint.value) {
      this.needsReorder = true;
      return 'reorder';
    }
  }
  this.needsReorder = false;
  return 'adequate';
};

// Method to consume stock
feedInventorySchema.methods.consumeStock = async function(quantity, unit) {
  // Convert consumption quantity to inventory unit (simplified)
  // In real app, implement proper unit conversion
  let consumptionInInventoryUnit = quantity;
  
  // Simple conversion for common units
  if (unit === 'g' && this.currentStock.unit === 'kg') {
    consumptionInInventoryUnit = quantity / 1000;
  } else if (unit === 'kg' && this.currentStock.unit === 'g') {
    consumptionInInventoryUnit = quantity * 1000;
  }
  
  this.currentStock.value -= consumptionInInventoryUnit;
  if (this.currentStock.value < 0) this.currentStock.value = 0;
  
  // Check stock level after consumption
  this.checkStockLevel();
  
  await this.save();
  return this;
};

const FeedInventory = mongoose.model('FeedInventory', feedInventorySchema);

module.exports = FeedInventory;