// src/modules/farms/farm.model.js
const mongoose = require('mongoose');

const farmSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
      minlength: [2, 'Farm name must be at least 2 characters long'],
      maxlength: [100, 'Farm name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    location: {
      type: String,
      trim: true,
    },
    themeColor: {
      type: String,
      default: '#4CAF50', // Default green color
      match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
farmSchema.index({ user: 1, isArchived: 1 });
farmSchema.index({ user: 1, isDefault: 1 });
farmSchema.index({ user: 1, name: 1 });

// Instance method to soft delete (archive)
farmSchema.methods.archive = async function () {
  this.isArchived = true;
  this.isActive = false;
  return this.save();
};

// Instance method to restore
farmSchema.methods.restore = async function () {
  this.isArchived = false;
  this.isActive = true;
  return this.save();
};

const Farm = mongoose.model('Farm', farmSchema);

module.exports = Farm;