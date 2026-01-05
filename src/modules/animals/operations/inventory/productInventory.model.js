const mongoose = require('mongoose');

const productInventorySchema = new mongoose.Schema(
  {
    // Product Identity
    productType: {
      type: String,
      required: true,
      enum: [
        'meat', 
        'milk', 
        'eggs', 
        'wool', 
        'honey',
        'skins', 
        'manure', 
        'manure_compost',
        'feathers',
        'other'
      ],
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Farm Reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
    
    // Animal Type Reference (for meat, milk, eggs, etc.)
    animalType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnimalType',
    },
    
    // Source Animal (optional - for specific animal products)
    sourceAnimal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
    },
    
    // Source Production Event (optional - for batch tracking)
    productionEvent: {
      type: mongoose.Schema.Types.ObjectId,
    },
    
    // Inventory Details
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'lb', 'liter', 'gallon', 'dozen', 'piece', 'bale', 'bag', 'ton'],
    },
    
    // Quality & Grading
    qualityGrade: {
      type: String,
      enum: ['premium', 'standard', 'commercial', 'feed_grade', null],
      default: null,
    },
    
    // Pricing Information
    unitPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'KSH',
    },
    
    // Shelf Life & Storage
    productionDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: Date,
    storageLocation: String,
    storageConditions: {
      type: String,
      enum: ['refrigerated', 'frozen', 'room_temp', 'dry', 'controlled'],
      default: 'room_temp',
    },
    
    // Status
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'spoiled', 'wasted', 'consumed'],
      default: 'available',
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

// Indexes for performance
productInventorySchema.index({ farm: 1, productType: 1, status: 1 });
productInventorySchema.index({ farm: 1, expiryDate: 1 });
productInventorySchema.index({ farm: 1, productName: 1 });
productInventorySchema.index({ farm: 1, animalType: 1 });

// Virtual for remaining shelf life
productInventorySchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
});

// Virtual for total value
productInventorySchema.virtual('totalValue').get(function() {
  return this.quantity * (this.unitPrice || 0);
});

// Method to check if product is about to expire
productInventorySchema.methods.isExpiringSoon = function(days = 7) {
  if (!this.expiryDate) return false;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= days && daysUntilExpiry > 0;
};

// Method to check if product has expired
productInventorySchema.methods.hasExpired = function() {
  if (!this.expiryDate) return false;
  const now = new Date();
  return now > new Date(this.expiryDate);
};

const ProductInventory = mongoose.model('ProductInventory', productInventorySchema);

module.exports = ProductInventory;