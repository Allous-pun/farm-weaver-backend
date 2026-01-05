const mongoose = require('mongoose');

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    // Adjustment Type
    adjustmentType: {
      type: String,
      required: true,
      enum: [
        'correction', 
        'spoilage', 
        'theft', 
        'damage', 
        'measurement_error',
        'production_error',
        'write_off',
        'found_stock',
        'other'
      ],
    },
    
    // Inventory Type
    inventoryType: {
      type: String,
      required: true,
      enum: ['product', 'feed', 'animal'],
    },
    
    // Reference to the inventory item
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'inventoryType',
    },
    
    // Farm Reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
    
    // Adjustment Details
    quantityBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    quantityAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    
    unit: {
      type: String,
      required: true,
    },
    
    // Reason & Details
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    
    // Financial Impact (optional)
    estimatedValueLoss: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'KSH',
    },
    
    // Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: Date,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'auto_approved'],
      default: 'pending',
    },
    
    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    
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

// Indexes for performance
inventoryAdjustmentSchema.index({ farm: 1, adjustmentType: 1 });
inventoryAdjustmentSchema.index({ farm: 1, inventoryType: 1, inventoryItem: 1 });
inventoryAdjustmentSchema.index({ farm: 1, approvalStatus: 1 });
inventoryAdjustmentSchema.index({ farm: 1, createdAt: -1 });

// Virtual for absolute change
inventoryAdjustmentSchema.virtual('absoluteChange').get(function() {
  return Math.abs(this.quantityChange);
});

// Method to check if adjustment increases inventory
inventoryAdjustmentSchema.methods.isIncrease = function() {
  return this.quantityChange > 0;
};

// Method to check if adjustment decreases inventory
inventoryAdjustmentSchema.methods.isDecrease = function() {
  return this.quantityChange < 0;
};

const InventoryAdjustment = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);

module.exports = InventoryAdjustment;