const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  // Item Type
  itemType: {
    type: String,
    required: true,
    enum: ['animal', 'product', 'feed', 'other'],
  },
  
  // Reference to the item
  item: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'items.itemType',
  },
  
  // Sale Details
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
  },
  unit: {
    type: String,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Additional Information
  description: String,
  qualityGrade: String,
});

const saleSchema = new mongoose.Schema(
  {
    // Sale Identification
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    
    // Farm Reference
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: true,
    },
    
    // Buyer Information
    buyerType: {
      type: String,
      enum: ['individual', 'business', 'restaurant', 'market', 'wholesaler', 'other'],
      default: 'individual',
    },
    buyerName: {
      type: String,
      trim: true,
    },
    buyerContact: String,
    buyerLocation: String,
    
    // Sale Details
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    saleType: {
      type: String,
      enum: ['retail', 'wholesale', 'auction', 'contract', 'barter'],
      default: 'retail',
    },
    
    // Items Sold
    items: [saleItemSchema],
    
    // Pricing Summary
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'KSH',
    },
    
    // Payment Information
    paymentMethod: {
      type: String,
      enum: ['cash', 'mobile_money', 'bank_transfer', 'credit', 'check', 'other'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    amountPaid: {
      type: Number,
      min: 0,
      default: 0,
    },
    amountDue: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // Delivery/Collection
    deliveryMethod: {
      type: String,
      enum: ['pickup', 'delivery', 'shipping'],
      default: 'pickup',
    },
    deliveryDate: Date,
    deliveryAddress: String,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending',
    },
    
    // Notes & Documentation
    notes: String,
    invoiceNotes: String,
    
    // System
    isActive: {
      type: Boolean,
      default: true,
    },
    isFinalized: {
      type: Boolean,
      default: false,
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
saleSchema.index({ farm: 1, saleNumber: 1 }, { unique: true });
saleSchema.index({ farm: 1, saleDate: -1 });
saleSchema.index({ farm: 1, buyerName: 1 });
saleSchema.index({ farm: 1, paymentStatus: 1 });
saleSchema.index({ farm: 1, 'items.itemType': 1, 'items.item': 1 });

// Pre-save middleware to generate sale number
saleSchema.pre('save', async function(next) {
  if (!this.saleNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ farm: this.farm });
    this.saleNumber = `SALE-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.totalAmount = this.subtotal - this.discount + this.tax;
  this.amountDue = this.totalAmount - this.amountPaid;
  
  next();
});

// Virtual for profit margin (simplified)
saleSchema.virtual('profitMargin').get(function() {
  // This would need cost information from production/animal records
  return null;
});

// Method to check if sale is complete
saleSchema.methods.isComplete = function() {
  return this.paymentStatus === 'paid' && this.deliveryStatus === 'delivered';
};

// Method to add payment
saleSchema.methods.addPayment = function(amount, method = 'cash') {
  this.amountPaid += amount;
  this.amountDue = Math.max(0, this.totalAmount - this.amountPaid);
  
  if (this.amountPaid >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
  }
  
  // In a real system, you'd create a payment record here
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;