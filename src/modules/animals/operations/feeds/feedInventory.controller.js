// src/modules/animals/operations/feeds/feedInventory.controller.js
const FeedInventory = require('./feedInventory.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');

// Create or update feed inventory item
const upsertFeedInventory = async (req, res) => {
  try {
    const userId = req.userId;
    const inventoryData = req.body;

    // Validate required fields
    if (!inventoryData.farm || !inventoryData.feedType || 
        !inventoryData.currentStock || !inventoryData.currentStock.value) {
      return res.status(400).json({
        status: 'error',
        message: 'Farm, feed type, and current stock are required',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: inventoryData.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      throw new Error('Farm not found or you do not have permission');
    }

    // Check if inventory item already exists for this farm and feed type
    const existingInventory = await FeedInventory.findOne({
      farm: inventoryData.farm,
      feedType: inventoryData.feedType,
      customFeedName: inventoryData.customFeedName || null,
      isActive: true,
    });

    let inventoryItem;
    
    if (existingInventory) {
      // Update existing inventory
      inventoryItem = await FeedInventory.findByIdAndUpdate(
        existingInventory._id,
        {
          ...inventoryData,
          lastUpdatedBy: userId,
          $inc: { __v: 1 },
        },
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      // Create new inventory
      inventoryData.lastUpdatedBy = userId;
      inventoryItem = await FeedInventory.create(inventoryData);
    }

    // Check stock level after update
    await inventoryItem.checkStockLevel();

    res.status(existingInventory ? 200 : 201).json({
      status: 'success',
      message: existingInventory ? 'Inventory updated successfully' : 'Inventory created successfully',
      data: inventoryItem,
    });
  } catch (error) {
    console.error('Error upserting feed inventory:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to upsert feed inventory',
    });
  }
};

// Get all inventory items for a farm
const getFarmInventory = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      throw new Error('Farm not found or you do not have permission');
    }

    const query = { farm: farmId };
    if (!includeInactive) {
      query.isActive = true;
    }

    const inventoryItems = await FeedInventory.find(query)
      .sort({ feedType: 1, customFeedName: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      data: inventoryItems,
    });
  } catch (error) {
    console.error('Error fetching farm inventory:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch farm inventory',
    });
  }
};

// Get inventory item by ID
const getInventoryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { inventoryId } = req.params;

    const inventoryItem = await FeedInventory.findById(inventoryId);
    
    if (!inventoryItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: inventoryItem.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    res.status(200).json({
      status: 'success',
      data: inventoryItem,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory item',
    });
  }
};

// Consume inventory (when feed is recorded)
const consumeInventory = async (req, res) => {
  try {
    const userId = req.userId;
    const { inventoryId } = req.params;
    const { quantity, unit } = req.body;

    if (!quantity || !unit) {
      return res.status(400).json({
        status: 'error',
        message: 'Quantity and unit are required',
      });
    }

    const inventoryItem = await FeedInventory.findById(inventoryId);
    
    if (!inventoryItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: inventoryItem.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Consume stock
    await inventoryItem.consumeStock(quantity, unit);

    res.status(200).json({
      status: 'success',
      message: 'Inventory consumed successfully',
      data: inventoryItem,
    });
  } catch (error) {
    console.error('Error consuming inventory:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to consume inventory',
    });
  }
};

// Update inventory item
const updateInventoryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { inventoryId } = req.params;
    const updateData = req.body;

    const inventoryItem = await FeedInventory.findById(inventoryId);
    
    if (!inventoryItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: inventoryItem.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Don't allow changing farm
    if (updateData.farm) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot change farm reference',
      });
    }

    updateData.lastUpdatedBy = userId;

    const updatedInventory = await FeedInventory.findByIdAndUpdate(
      inventoryId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    // Check stock level after update
    await updatedInventory.checkStockLevel();

    res.status(200).json({
      status: 'success',
      message: 'Inventory updated successfully',
      data: updatedInventory,
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update inventory',
    });
  }
};

// Delete inventory item (soft delete)
const deleteInventoryItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { inventoryId } = req.params;

    const inventoryItem = await FeedInventory.findById(inventoryId);
    
    if (!inventoryItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory item not found',
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: inventoryItem.farm,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // Soft delete
    inventoryItem.isActive = false;
    inventoryItem.lastUpdatedBy = userId;
    await inventoryItem.save();

    res.status(200).json({
      status: 'success',
      message: 'Inventory item deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete inventory',
    });
  }
};

// Get low inventory alerts
const getLowInventoryAlerts = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;

    // Verify farm belongs to user
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      throw new Error('Farm not found or you do not have permission');
    }

    const lowInventoryItems = await FeedInventory.find({
      farm: farmId,
      needsReorder: true,
      isActive: true,
    }).lean();

    // Check for expiring items (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringItems = await FeedInventory.find({
      farm: farmId,
      expirationDate: { $lte: thirtyDaysFromNow, $gte: new Date() },
      isActive: true,
    }).lean();

    res.status(200).json({
      status: 'success',
      data: {
        lowInventory: lowInventoryItems,
        expiringItems,
        totalAlerts: lowInventoryItems.length + expiringItems.length,
      },
    });
  } catch (error) {
    console.error('Error fetching low inventory alerts:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch inventory alerts',
    });
  }
};

module.exports = {
  upsertFeedInventory,
  getFarmInventory,
  getInventoryItem,
  consumeInventory,
  updateInventoryItem,
  deleteInventoryItem,
  getLowInventoryAlerts,
};