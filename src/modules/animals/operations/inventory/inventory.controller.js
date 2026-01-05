const inventoryService = require('./inventory.service');
const ProductInventory = require('./productInventory.model');
const Sale = require('./sale.model');

const inventoryController = {
  // =================== PRODUCT INVENTORY ===================
  
  // Add product to inventory
  addProductToInventory: async (req, res) => {
    try {
      const userId = req.userId;
      const productData = req.body;
      
      const product = await inventoryService.addProductToInventory(productData, userId);
      
      res.status(201).json({
        status: 'success',
        message: 'Product added to inventory successfully',
        data: product,
      });
    } catch (error) {
      console.error('Error adding product to inventory:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to add product to inventory',
      });
    }
  },
  
  // Get product inventory by farm
  getProductInventory: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        productType: req.query.productType,
        animalType: req.query.animalType,
        status: req.query.status,
        search: req.query.search,
        expiringSoon: req.query.expiringSoon,
        expired: req.query.expired,
      };
      
      const products = await inventoryService.getProductInventoryByFarm(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: products,
      });
    } catch (error) {
      console.error('Error fetching product inventory:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch product inventory',
      });
    }
  },
  
  // Update product inventory
  updateProductInventory: async (req, res) => {
    try {
      const userId = req.userId;
      const { productId } = req.params;
      const { quantity, unitPrice, status, notes } = req.body;
      
      const product = await ProductInventory.findById(productId);
      
      if (!product) {
        return res.status(404).json({
          status: 'error',
          message: 'Product not found',
        });
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: product.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission for this product',
        });
      }
      
      // Update product
      if (quantity !== undefined) {
        product.quantity = quantity;
      }
      if (unitPrice !== undefined) {
        product.unitPrice = unitPrice;
      }
      if (status) {
        product.status = status;
      }
      if (notes !== undefined) {
        product.notes = notes;
      }
      
      await product.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Product inventory updated successfully',
        data: product,
      });
    } catch (error) {
      console.error('Error updating product inventory:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update product inventory',
      });
    }
  },
  
  // Get product inventory statistics
  getProductInventoryStatistics: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const statistics = await inventoryService.getProductInventoryStatistics(farmId, userId);
      
      res.status(200).json({
        status: 'success',
        data: statistics,
      });
    } catch (error) {
      console.error('Error fetching product inventory statistics:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch product inventory statistics',
      });
    }
  },
  
  // =================== ANIMAL INVENTORY ===================
  
  // Get animal inventory
  getAnimalInventory: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        animalType: req.query.animalType,
        gender: req.query.gender,
        ageFrom: req.query.ageFrom ? parseInt(req.query.ageFrom) : undefined,
        ageTo: req.query.ageTo ? parseInt(req.query.ageTo) : undefined,
        readyForSale: req.query.readyForSale === 'true',
        search: req.query.search,
      };
      
      const animals = await inventoryService.getAnimalInventory(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: animals,
      });
    } catch (error) {
      console.error('Error fetching animal inventory:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch animal inventory',
      });
    }
  },
  
  // Get animal inventory statistics
  getAnimalInventoryStatistics: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const statistics = await inventoryService.getAnimalInventoryStatistics(farmId, userId);
      
      res.status(200).json({
        status: 'success',
        data: statistics,
      });
    } catch (error) {
      console.error('Error fetching animal inventory statistics:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch animal inventory statistics',
      });
    }
  },
  
  // =================== SALES ===================
  
  // Create a sale
  createSale: async (req, res) => {
    try {
      const userId = req.userId;
      const saleData = req.body;
      
      const sale = await inventoryService.createSale(saleData, userId);
      
      res.status(201).json({
        status: 'success',
        message: 'Sale recorded successfully',
        data: sale,
      });
    } catch (error) {
      console.error('Error creating sale:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('must have at least one item')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('not found') || 
          error.message.includes('does not belong') ||
          error.message.includes('not available') ||
          error.message.includes('Insufficient quantity')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to record sale',
      });
    }
  },
  
  // Get sales by farm
  getSales: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        saleDateFrom: req.query.saleDateFrom,
        saleDateTo: req.query.saleDateTo,
        paymentStatus: req.query.paymentStatus,
        buyerName: req.query.buyerName,
        saleType: req.query.saleType,
      };
      
      const sales = await inventoryService.getSalesByFarm(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: sales,
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch sales',
      });
    }
  },
  
  // Get sale by ID
  getSaleById: async (req, res) => {
    try {
      const userId = req.userId;
      const { saleId } = req.params;
      
      const sale = await Sale.findById(saleId)
        .populate({
          path: 'items.item',
          select: 'tagNumber name productName',
        })
        .populate('createdBy', 'name email')
        .lean();
      
      if (!sale) {
        return res.status(404).json({
          status: 'error',
          message: 'Sale not found',
        });
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: sale.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission for this sale',
        });
      }
      
      res.status(200).json({
        status: 'success',
        data: sale,
      });
    } catch (error) {
      console.error('Error fetching sale:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch sale',
      });
    }
  },
  
  // Update sale payment
  updateSalePayment: async (req, res) => {
    try {
      const userId = req.userId;
      const { saleId } = req.params;
      const { amount, method, status } = req.body;
      
      const sale = await Sale.findById(saleId);
      
      if (!sale) {
        return res.status(404).json({
          status: 'error',
          message: 'Sale not found',
        });
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: sale.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return res.status(403).json({
          status: 'error',
          message: 'You do not have permission for this sale',
        });
      }
      
      // Update payment
      if (amount !== undefined) {
        sale.amountPaid = amount;
        sale.amountDue = Math.max(0, sale.totalAmount - sale.amountPaid);
        
        if (sale.amountPaid >= sale.totalAmount) {
          sale.paymentStatus = 'paid';
        } else if (sale.amountPaid > 0) {
          sale.paymentStatus = 'partial';
        } else {
          sale.paymentStatus = 'pending';
        }
      }
      
      if (method) {
        sale.paymentMethod = method;
      }
      
      if (status) {
        sale.paymentStatus = status;
      }
      
      await sale.save();
      
      res.status(200).json({
        status: 'success',
        message: 'Sale payment updated successfully',
        data: sale,
      });
    } catch (error) {
      console.error('Error updating sale payment:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update sale payment',
      });
    }
  },
  
  // Get sale statistics
  getSaleStatistics: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      const { period = 'month' } = req.query;
      
      const statistics = await inventoryService.getSaleStatistics(farmId, userId, period);
      
      res.status(200).json({
        status: 'success',
        data: statistics,
      });
    } catch (error) {
      console.error('Error fetching sale statistics:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch sale statistics',
      });
    }
  },
  
  // =================== INVENTORY ADJUSTMENTS ===================
  
  // Create inventory adjustment
  createInventoryAdjustment: async (req, res) => {
    try {
      const userId = req.userId;
      const adjustmentData = req.body;
      
      const adjustment = await inventoryService.createInventoryAdjustment(adjustmentData, userId);
      
      res.status(201).json({
        status: 'success',
        message: 'Inventory adjustment created successfully',
        data: adjustment,
      });
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('not found') || error.message.includes('Unsupported')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to create inventory adjustment',
      });
    }
  },
  
  // Apply inventory adjustment
  applyInventoryAdjustment: async (req, res) => {
    try {
      const userId = req.userId;
      const { adjustmentId } = req.params;
      
      const adjustment = await inventoryService.applyInventoryAdjustment(adjustmentId, userId);
      
      res.status(200).json({
        status: 'success',
        message: 'Inventory adjustment applied successfully',
        data: adjustment,
      });
    } catch (error) {
      console.error('Error applying inventory adjustment:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      if (error.message.includes('not found') || error.message.includes('cannot be applied')) {
        return res.status(400).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to apply inventory adjustment',
      });
    }
  },
  
  // Get inventory adjustments
  getInventoryAdjustments: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const filters = {
        adjustmentType: req.query.adjustmentType,
        inventoryType: req.query.inventoryType,
        approvalStatus: req.query.approvalStatus,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
      };
      
      const adjustments = await inventoryService.getInventoryAdjustments(farmId, userId, filters);
      
      res.status(200).json({
        status: 'success',
        data: adjustments,
      });
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch inventory adjustments',
      });
    }
  },
  
  // =================== DASHBOARD & REPORTS ===================
  
  // Get inventory dashboard
  getInventoryDashboard: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const dashboard = await inventoryService.getInventoryDashboard(farmId, userId);
      
      res.status(200).json({
        status: 'success',
        data: dashboard,
      });
    } catch (error) {
      console.error('Error fetching inventory dashboard:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch inventory dashboard',
      });
    }
  },
  
  // Get inventory valuation report
  getInventoryValuationReport: async (req, res) => {
    try {
      const userId = req.userId;
      const { farmId } = req.params;
      
      const report = await inventoryService.getInventoryValuationReport(farmId, userId);
      
      res.status(200).json({
        status: 'success',
        data: report,
      });
    } catch (error) {
      console.error('Error generating inventory valuation report:', error);
      
      if (error.message.includes('Farm not found') || error.message.includes('permission')) {
        return res.status(403).json({
          status: 'error',
          message: error.message,
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate inventory valuation report',
      });
    }
  },
  
  // =================== UTILITY ENDPOINTS ===================
  
  // Get product types
  getProductTypes: async (req, res) => {
    try {
      const productTypes = [
        { value: 'meat', label: 'Meat', units: ['kg', 'lb'] },
        { value: 'milk', label: 'Milk', units: ['liter', 'gallon'] },
        { value: 'eggs', label: 'Eggs', units: ['dozen', 'piece'] },
        { value: 'wool', label: 'Wool', units: ['kg', 'lb', 'bale'] },
        { value: 'honey', label: 'Honey', units: ['kg', 'lb', 'liter'] },
        { value: 'skins', label: 'Skins/Hides', units: ['piece'] },
        { value: 'manure', label: 'Manure', units: ['kg', 'lb', 'bag', 'ton'] },
        { value: 'manure_compost', label: 'Manure Compost', units: ['kg', 'lb', 'bag', 'ton'] },
        { value: 'feathers', label: 'Feathers', units: ['kg', 'lb'] },
        { value: 'other', label: 'Other Products', units: ['kg', 'lb', 'liter', 'piece'] },
      ];
      
      res.status(200).json({
        status: 'success',
        data: productTypes,
      });
    } catch (error) {
      console.error('Error fetching product types:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch product types',
      });
    }
  },
  
  // Get adjustment types
  getAdjustmentTypes: async (req, res) => {
    try {
      const adjustmentTypes = [
        { value: 'correction', label: 'Correction', description: 'Manual correction of inventory count' },
        { value: 'spoilage', label: 'Spoilage', description: 'Product spoiled or went bad' },
        { value: 'theft', label: 'Theft/Loss', description: 'Inventory stolen or lost' },
        { value: 'damage', label: 'Damage', description: 'Inventory damaged and unusable' },
        { value: 'measurement_error', label: 'Measurement Error', description: 'Error in initial measurement' },
        { value: 'production_error', label: 'Production Error', description: 'Error in production process' },
        { value: 'write_off', label: 'Write Off', description: 'Intentional removal from inventory' },
        { value: 'found_stock', label: 'Found Stock', description: 'Previously unrecorded inventory found' },
        { value: 'other', label: 'Other', description: 'Other adjustment reason' },
      ];
      
      res.status(200).json({
        status: 'success',
        data: adjustmentTypes,
      });
    } catch (error) {
      console.error('Error fetching adjustment types:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch adjustment types',
      });
    }
  },
  
  // Get sale types
  getSaleTypes: async (req, res) => {
    try {
      const saleTypes = [
        { value: 'retail', label: 'Retail Sale', description: 'Direct sale to end consumer' },
        { value: 'wholesale', label: 'Wholesale', description: 'Sale to retailer or distributor' },
        { value: 'auction', label: 'Auction', description: 'Sale through auction process' },
        { value: 'contract', label: 'Contract Sale', description: 'Pre-agreed contract sale' },
        { value: 'barter', label: 'Barter/Trade', description: 'Exchange for goods/services' },
      ];
      
      res.status(200).json({
        status: 'success',
        data: saleTypes,
      });
    } catch (error) {
      console.error('Error fetching sale types:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch sale types',
      });
    }
  },
  
  // Get buyer types
  getBuyerTypes: async (req, res) => {
    try {
      const buyerTypes = [
        { value: 'individual', label: 'Individual', description: 'Individual consumer' },
        { value: 'business', label: 'Business', description: 'Company or organization' },
        { value: 'restaurant', label: 'Restaurant', description: 'Restaurant or food service' },
        { value: 'market', label: 'Market', description: 'Market vendor or stall' },
        { value: 'wholesaler', label: 'Wholesaler', description: 'Wholesale distributor' },
        { value: 'other', label: 'Other', description: 'Other type of buyer' },
      ];
      
      res.status(200).json({
        status: 'success',
        data: buyerTypes,
      });
    } catch (error) {
      console.error('Error fetching buyer types:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch buyer types',
      });
    }
  },
};

module.exports = inventoryController;