const ProductInventory = require('./productInventory.model');
const InventoryAdjustment = require('./inventoryAdjustment.model');
const Sale = require('./sale.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');

const inventoryService = {
  // =================== PRODUCT INVENTORY ===================
  
  // Add product to inventory (from production)
  addProductToInventory: async (productData, userId) => {
    try {
      const {
        farm,
        productType,
        productName,
        quantity,
        unit,
        animalType,
        sourceAnimal,
        productionEvent,
        qualityGrade,
        unitPrice,
        expiryDate,
        storageLocation,
        notes,
      } = productData;
      
      // Verify farm belongs to user
      const farmRecord = await Farm.findOne({
        _id: farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farmRecord) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Create product inventory record
      const product = new ProductInventory({
        farm,
        productType,
        productName,
        quantity,
        unit,
        animalType,
        sourceAnimal,
        productionEvent,
        qualityGrade,
        unitPrice,
        expiryDate,
        storageLocation,
        notes,
        createdBy: userId,
      });
      
      await product.save();
      
      return product;
    } catch (error) {
      console.error('Error adding product to inventory:', error);
      throw error;
    }
  },
  
  // Update product inventory quantity
  updateProductQuantity: async (productId, userId, quantityChange, reason = 'adjustment') => {
    try {
      const product = await ProductInventory.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Verify farm belongs to user
      const farmRecord = await Farm.findOne({
        _id: product.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farmRecord) {
        throw new Error('You do not have permission for this farm');
      }
      
      const quantityBefore = product.quantity;
      const quantityAfter = Math.max(0, quantityBefore + quantityChange);
      
      // Update product
      product.quantity = quantityAfter;
      await product.save();
      
      // Create adjustment record
      if (quantityChange !== 0) {
        const adjustment = new InventoryAdjustment({
          adjustmentType: 'correction',
          inventoryType: 'product',
          inventoryItem: productId,
          farm: product.farm,
          quantityBefore,
          quantityChange,
          quantityAfter,
          unit: product.unit,
          reason,
          createdBy: userId,
          approvalStatus: 'auto_approved',
        });
        
        await adjustment.save();
      }
      
      return product;
    } catch (error) {
      console.error('Error updating product quantity:', error);
      throw error;
    }
  },
  
  // Get product inventory by farm
  getProductInventoryByFarm: async (farmId, userId, filters = {}) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      const query = { farm: farmId, isActive: true };
      
      // Apply filters
      if (filters.productType) {
        query.productType = filters.productType;
      }
      
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }
      
      if (filters.status) {
        query.status = filters.status;
      } else {
        query.status = 'available';
      }
      
      if (filters.search) {
        query.$or = [
          { productName: { $regex: filters.search, $options: 'i' } },
        ];
      }
      
      // Expiry filter
      if (filters.expiringSoon) {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(filters.expiringSoon));
        query.expiryDate = { $lte: date, $gte: new Date() };
      }
      
      if (filters.expired) {
        query.expiryDate = { $lt: new Date() };
        query.status = 'available'; // Still available but expired
      }
      
      const products = await ProductInventory.find(query)
        .populate('animalType', 'name')
        .populate('sourceAnimal', 'tagNumber name')
        .sort({ productName: 1 })
        .lean();
      
      return products;
    } catch (error) {
      console.error('Error fetching product inventory:', error);
      throw error;
    }
  },
  
  // Get product inventory statistics
  getProductInventoryStatistics: async (farmId, userId) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get all products
      const products = await ProductInventory.find({ 
        farm: farmId, 
        isActive: true,
        status: 'available',
      });
      
      // Calculate statistics
      const statistics = {
        totalProducts: products.length,
        totalQuantity: 0,
        totalValue: 0,
        byProductType: {},
        byAnimalType: {},
        expiringSoon: 0,
        expired: 0,
        lowStock: 0,
      };
      
      const now = new Date();
      
      products.forEach(product => {
        // Total quantity
        statistics.totalQuantity += product.quantity;
        
        // Total value
        if (product.unitPrice) {
          statistics.totalValue += product.quantity * product.unitPrice;
        }
        
        // By product type
        if (!statistics.byProductType[product.productType]) {
          statistics.byProductType[product.productType] = {
            count: 0,
            quantity: 0,
            value: 0,
          };
        }
        statistics.byProductType[product.productType].count++;
        statistics.byProductType[product.productType].quantity += product.quantity;
        if (product.unitPrice) {
          statistics.byProductType[product.productType].value += product.quantity * product.unitPrice;
        }
        
        // By animal type
        if (product.animalType) {
          const animalTypeId = product.animalType.toString();
          if (!statistics.byAnimalType[animalTypeId]) {
            statistics.byAnimalType[animalTypeId] = {
              count: 0,
              quantity: 0,
              value: 0,
            };
          }
          statistics.byAnimalType[animalTypeId].count++;
          statistics.byAnimalType[animalTypeId].quantity += product.quantity;
          if (product.unitPrice) {
            statistics.byAnimalType[animalTypeId].value += product.quantity * product.unitPrice;
          }
        }
        
        // Expiry status
        if (product.expiryDate) {
          const expiryDate = new Date(product.expiryDate);
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
            statistics.expiringSoon++;
          } else if (daysUntilExpiry <= 0) {
            statistics.expired++;
          }
        }
        
        // Low stock (less than 10% of typical or less than 5 units)
        if (product.quantity < 5 || (product.unitPrice && product.quantity * product.unitPrice < 100)) {
          statistics.lowStock++;
        }
      });
      
      // Convert animal type IDs to names
      const animalTypeIds = Object.keys(statistics.byAnimalType);
      if (animalTypeIds.length > 0) {
        const animalTypes = await AnimalType.find({ _id: { $in: animalTypeIds } })
          .select('name')
          .lean();
        
        const animalTypeMap = {};
        animalTypes.forEach(type => {
          animalTypeMap[type._id.toString()] = type.name;
        });
        
        // Replace IDs with names
        const byAnimalTypeWithNames = {};
        Object.entries(statistics.byAnimalType).forEach(([id, data]) => {
          const name = animalTypeMap[id] || `Unknown (${id})`;
          byAnimalTypeWithNames[name] = data;
        });
        
        statistics.byAnimalType = byAnimalTypeWithNames;
      }
      
      return statistics;
    } catch (error) {
      console.error('Error fetching product inventory statistics:', error);
      throw error;
    }
  },
  
  // =================== ANIMAL INVENTORY ===================
  
  // Get live animals inventory (filtered view of animal records)
  getAnimalInventory: async (farmId, userId, filters = {}) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      const query = { 
        farm: farmId, 
        status: 'alive',
        isActive: true,
      };
      
      // Apply filters
      if (filters.animalType) {
        query.animalType = filters.animalType;
      }
      
      if (filters.gender) {
        query.gender = filters.gender;
      }
      
      if (filters.ageFrom || filters.ageTo) {
        const now = new Date();
        if (filters.ageFrom) {
          const minDate = new Date(now);
          minDate.setDate(minDate.getDate() - filters.ageFrom * 365);
          query.dateOfBirth = { $lte: minDate };
        }
        if (filters.ageTo) {
          const maxDate = new Date(now);
          maxDate.setDate(maxDate.getDate() - filters.ageTo * 365);
          query.dateOfBirth = { ...query.dateOfBirth, $gte: maxDate };
        }
      }
      
      if (filters.readyForSale) {
        query.healthStatus = { $in: ['excellent', 'good'] };
        // Add other criteria for "ready for sale"
      }
      
      const animals = await Animal.find(query)
        .populate('animalType', 'name category')
        .populate('sire', 'tagNumber name')
        .populate('dam', 'tagNumber name')
        .sort({ tagNumber: 1 })
        .lean();
      
      // Add calculated fields
      animals.forEach(animal => {
        // Calculate age
        if (animal.dateOfBirth) {
          const dob = new Date(animal.dateOfBirth);
          const now = new Date();
          const ageInDays = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
          animal.age = {
            days: ageInDays,
            months: Math.floor(ageInDays / 30),
            years: Math.floor(ageInDays / 365),
          };
        }
        
        // Calculate estimated value (simplified)
        if (animal.weight?.value) {
          // Simple estimation: weight * price per kg
          const pricePerKg = 500; // Default price
          animal.estimatedValue = animal.weight.value * pricePerKg;
        }
      });
      
      return animals;
    } catch (error) {
      console.error('Error fetching animal inventory:', error);
      throw error;
    }
  },
  
  // Get animal inventory statistics
  getAnimalInventoryStatistics: async (farmId, userId) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get all alive animals
      const animals = await Animal.find({ 
        farm: farmId, 
        status: 'alive',
        isActive: true,
      }).populate('animalType', 'name');
      
      const statistics = {
        totalAnimals: animals.length,
        byAnimalType: {},
        byGender: {},
        byAgeGroup: {},
        estimatedTotalValue: 0,
        readyForSale: 0,
        breedingStock: 0,
      };
      
      const now = new Date();
      
      animals.forEach(animal => {
        // By animal type
        const animalTypeName = animal.animalType?.name || 'Unknown';
        if (!statistics.byAnimalType[animalTypeName]) {
          statistics.byAnimalType[animalTypeName] = {
            count: 0,
            males: 0,
            females: 0,
            estimatedValue: 0,
          };
        }
        statistics.byAnimalType[animalTypeName].count++;
        
        // By gender
        if (!statistics.byGender[animal.gender]) {
          statistics.byGender[animal.gender] = 0;
        }
        statistics.byGender[animal.gender]++;
        
        if (animal.gender === 'male') {
          statistics.byAnimalType[animalTypeName].males++;
        } else if (animal.gender === 'female') {
          statistics.byAnimalType[animalTypeName].females++;
        }
        
        // By age group
        if (animal.dateOfBirth) {
          const dob = new Date(animal.dateOfBirth);
          const ageInDays = Math.floor((now - dob) / (1000 * 60 * 60 * 24));
          let ageGroup = 'adult';
          
          if (ageInDays < 180) ageGroup = 'juvenile';
          else if (ageInDays < 365) ageGroup = 'young';
          else if (ageInDays > 365 * 5) ageGroup = 'senior';
          
          if (!statistics.byAgeGroup[ageGroup]) {
            statistics.byAgeGroup[ageGroup] = 0;
          }
          statistics.byAgeGroup[ageGroup]++;
        }
        
        // Estimated value
        if (animal.weight?.value) {
          const pricePerKg = 500; // Default price
          const estimatedValue = animal.weight.value * pricePerKg;
          statistics.estimatedTotalValue += estimatedValue;
          statistics.byAnimalType[animalTypeName].estimatedValue += estimatedValue;
        }
        
        // Ready for sale criteria
        if (animal.healthStatus === 'excellent' || animal.healthStatus === 'good') {
          statistics.readyForSale++;
        }
        
        // Breeding stock criteria
        if ((animal.gender === 'female' && animal.reproductiveStatus === 'open') ||
            (animal.gender === 'male' && animal.breedingStatus === 'active')) {
          statistics.breedingStock++;
        }
      });
      
      return statistics;
    } catch (error) {
      console.error('Error fetching animal inventory statistics:', error);
      throw error;
    }
  },
  
  // =================== SALES ===================
  
  // Create a sale
  createSale: async (saleData, userId) => {
    try {
      const {
        farm,
        buyerType,
        buyerName,
        buyerContact,
        buyerLocation,
        saleDate,
        saleType,
        items,
        discount,
        tax,
        paymentMethod,
        deliveryMethod,
        deliveryDate,
        deliveryAddress,
        notes,
        invoiceNotes,
      } = saleData;
      
      // Verify farm belongs to user
      const farmRecord = await Farm.findOne({
        _id: farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farmRecord) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Sale must have at least one item');
      }
      
      // Process items and update inventory
      for (const item of items) {
        await inventoryService.processSaleItem(item, farm, userId);
      }
      
      // Create sale record
      const sale = new Sale({
        farm,
        buyerType,
        buyerName,
        buyerContact,
        buyerLocation,
        saleDate: saleDate || new Date(),
        saleType,
        items,
        discount: discount || 0,
        tax: tax || 0,
        paymentMethod: paymentMethod || 'cash',
        deliveryMethod: deliveryMethod || 'pickup',
        deliveryDate,
        deliveryAddress,
        notes,
        invoiceNotes,
        createdBy: userId,
      });
      
      await sale.save();
      
      // Populate item details
      const populatedSale = await Sale.findById(sale._id)
        .populate({
          path: 'items.item',
          select: 'tagNumber name productName quantity unit unitPrice',
        });
      
      return populatedSale;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },
  
  // Process a sale item and update inventory
  processSaleItem: async (item, farmId, userId) => {
    try {
      const { itemType, item: itemId, quantity } = item;
      
      if (itemType === 'animal') {
        // Process animal sale
        const animal = await Animal.findById(itemId);
        
        if (!animal) {
          throw new Error(`Animal ${itemId} not found`);
        }
        
        if (animal.farm.toString() !== farmId.toString()) {
          throw new Error(`Animal ${itemId} does not belong to this farm`);
        }
        
        if (animal.status !== 'alive') {
          throw new Error(`Animal ${itemId} is not alive and cannot be sold`);
        }
        
        // Update animal status
        animal.status = 'sold';
        animal.isActive = false;
        animal.statusDate = new Date();
        animal.statusReason = 'Sold';
        
        // Store sale details on animal record
        animal.saleDetails = {
          salePrice: item.unitPrice * quantity,
          saleDate: new Date(),
          buyerName: item.description || 'Unknown',
        };
        
        await animal.save();
        
      } else if (itemType === 'product') {
        // Process product sale
        const product = await ProductInventory.findById(itemId);
        
        if (!product) {
          throw new Error(`Product ${itemId} not found`);
        }
        
        if (product.farm.toString() !== farmId.toString()) {
          throw new Error(`Product ${itemId} does not belong to this farm`);
        }
        
        if (product.status !== 'available') {
          throw new Error(`Product ${itemId} is not available for sale`);
        }
        
        if (product.quantity < quantity) {
          throw new Error(`Insufficient quantity of ${product.productName}. Available: ${product.quantity}, Requested: ${quantity}`);
        }
        
        // Update product quantity
        product.quantity -= quantity;
        
        // If quantity becomes 0, mark as sold
        if (product.quantity === 0) {
          product.status = 'sold';
        }
        
        await product.save();
        
        // Create inventory adjustment for the sale
        const adjustment = new InventoryAdjustment({
          adjustmentType: 'correction',
          inventoryType: 'product',
          inventoryItem: itemId,
          farm: farmId,
          quantityBefore: product.quantity + quantity,
          quantityChange: -quantity,
          quantityAfter: product.quantity,
          unit: product.unit,
          reason: 'Sale',
          createdBy: userId,
          approvalStatus: 'auto_approved',
        });
        
        await adjustment.save();
      }
      // Note: Feed sales would be handled similarly
      
      return true;
    } catch (error) {
      console.error('Error processing sale item:', error);
      throw error;
    }
  },
  
  // Get sales by farm
  getSalesByFarm: async (farmId, userId, filters = {}) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      const query = { farm: farmId, isActive: true };
      
      // Apply filters
      if (filters.saleDateFrom || filters.saleDateTo) {
        query.saleDate = {};
        if (filters.saleDateFrom) {
          query.saleDate.$gte = new Date(filters.saleDateFrom);
        }
        if (filters.saleDateTo) {
          query.saleDate.$lte = new Date(filters.saleDateTo);
        }
      }
      
      if (filters.paymentStatus) {
        query.paymentStatus = filters.paymentStatus;
      }
      
      if (filters.buyerName) {
        query.buyerName = { $regex: filters.buyerName, $options: 'i' };
      }
      
      if (filters.saleType) {
        query.saleType = filters.saleType;
      }
      
      const sales = await Sale.find(query)
        .populate({
          path: 'items.item',
          select: 'tagNumber name productName',
        })
        .sort({ saleDate: -1 })
        .lean();
      
      return sales;
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  },
  
  // Get sale statistics
  getSaleStatistics: async (farmId, userId, period = 'month') => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Calculate date range based on period
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        case 'all':
        default:
          startDate = new Date(0); // Beginning of time
          break;
      }
      
      // Get sales in period
      const sales = await Sale.find({
        farm: farmId,
        saleDate: { $gte: startDate, $lte: now },
        isActive: true,
      }).lean();
      
      const statistics = {
        period,
        totalSales: sales.length,
        totalRevenue: 0,
        averageSaleValue: 0,
        byItemType: {},
        byPaymentStatus: {},
        byBuyerType: {},
        topBuyers: [],
        dailyRevenue: {},
      };
      
      sales.forEach(sale => {
        // Total revenue
        statistics.totalRevenue += sale.totalAmount;
        
        // By item type
        sale.items.forEach(item => {
          if (!statistics.byItemType[item.itemType]) {
            statistics.byItemType[item.itemType] = {
              count: 0,
              revenue: 0,
            };
          }
          statistics.byItemType[item.itemType].count++;
          statistics.byItemType[item.itemType].revenue += item.totalPrice;
        });
        
        // By payment status
        if (!statistics.byPaymentStatus[sale.paymentStatus]) {
          statistics.byPaymentStatus[sale.paymentStatus] = {
            count: 0,
            revenue: 0,
          };
        }
        statistics.byPaymentStatus[sale.paymentStatus].count++;
        statistics.byPaymentStatus[sale.paymentStatus].revenue += sale.totalAmount;
        
        // By buyer type
        if (!statistics.byBuyerType[sale.buyerType]) {
          statistics.byBuyerType[sale.buyerType] = {
            count: 0,
            revenue: 0,
          };
        }
        statistics.byBuyerType[sale.buyerType].count++;
        statistics.byBuyerType[sale.buyerType].revenue += sale.totalAmount;
        
        // Track buyer for top buyers list
        if (sale.buyerName) {
          const existingBuyer = statistics.topBuyers.find(b => b.name === sale.buyerName);
          if (existingBuyer) {
            existingBuyer.totalSpent += sale.totalAmount;
            existingBuyer.purchaseCount++;
          } else {
            statistics.topBuyers.push({
              name: sale.buyerName,
              totalSpent: sale.totalAmount,
              purchaseCount: 1,
            });
          }
        }
        
        // Daily revenue
        const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
        if (!statistics.dailyRevenue[saleDate]) {
          statistics.dailyRevenue[saleDate] = 0;
        }
        statistics.dailyRevenue[saleDate] += sale.totalAmount;
      });
      
      // Calculate averages
      if (sales.length > 0) {
        statistics.averageSaleValue = statistics.totalRevenue / sales.length;
      }
      
      // Sort top buyers
      statistics.topBuyers.sort((a, b) => b.totalSpent - a.totalSpent);
      statistics.topBuyers = statistics.topBuyers.slice(0, 10);
      
      return statistics;
    } catch (error) {
      console.error('Error fetching sale statistics:', error);
      throw error;
    }
  },
  
  // =================== INVENTORY ADJUSTMENTS ===================
  
  // Create inventory adjustment
  createInventoryAdjustment: async (adjustmentData, userId) => {
    try {
      const {
        adjustmentType,
        inventoryType,
        inventoryItem,
        quantityChange,
        reason,
        description,
        estimatedValueLoss,
      } = adjustmentData;
      
      // Get the inventory item
      let item;
      let farmId;
      let unit;
      let quantityBefore;
      
      if (inventoryType === 'product') {
        item = await ProductInventory.findById(inventoryItem);
        if (!item) {
          throw new Error('Product inventory item not found');
        }
        farmId = item.farm;
        unit = item.unit;
        quantityBefore = item.quantity;
      } else if (inventoryType === 'animal') {
        item = await Animal.findById(inventoryItem);
        if (!item) {
          throw new Error('Animal not found');
        }
        farmId = item.farm;
        unit = 'head'; // Animals are counted as "head"
        quantityBefore = item.status === 'alive' ? 1 : 0;
      } else {
        throw new Error(`Unsupported inventory type: ${inventoryType}`);
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      const quantityAfter = Math.max(0, quantityBefore + quantityChange);
      
      // Create adjustment record
      const adjustment = new InventoryAdjustment({
        adjustmentType,
        inventoryType,
        inventoryItem,
        farm: farmId,
        quantityBefore,
        quantityChange,
        quantityAfter,
        unit,
        reason,
        description,
        estimatedValueLoss,
        createdBy: userId,
        approvalStatus: adjustmentType === 'correction' ? 'auto_approved' : 'pending',
      });
      
      await adjustment.save();
      
      // If auto-approved, apply the adjustment
      if (adjustment.approvalStatus === 'auto_approved') {
        await inventoryService.applyInventoryAdjustment(adjustment._id, userId);
      }
      
      return adjustment;
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      throw error;
    }
  },
  
  // Apply inventory adjustment
  applyInventoryAdjustment: async (adjustmentId, userId) => {
    try {
      const adjustment = await InventoryAdjustment.findById(adjustmentId);
      
      if (!adjustment) {
        throw new Error('Adjustment not found');
      }
      
      if (adjustment.approvalStatus !== 'pending' && adjustment.approvalStatus !== 'auto_approved') {
        throw new Error(`Adjustment cannot be applied. Status: ${adjustment.approvalStatus}`);
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: adjustment.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Update the inventory item
      if (adjustment.inventoryType === 'product') {
        const product = await ProductInventory.findById(adjustment.inventoryItem);
        if (product) {
          product.quantity = adjustment.quantityAfter;
          
          // Update status if quantity is 0
          if (product.quantity === 0 && adjustment.quantityChange < 0) {
            if (adjustment.adjustmentType === 'spoilage') {
              product.status = 'spoiled';
            } else if (adjustment.adjustmentType === 'theft') {
              product.status = 'wasted';
            } else {
              product.status = 'sold';
            }
          }
          
          await product.save();
        }
      } else if (adjustment.inventoryType === 'animal') {
        const animal = await Animal.findById(adjustment.inventoryItem);
        if (animal) {
          // For animals, quantity change typically means status change
          if (adjustment.quantityChange === -1) {
            if (adjustment.adjustmentType === 'spoilage' || adjustment.adjustmentType === 'damage') {
              animal.status = 'deceased';
              animal.statusReason = adjustment.reason;
            } else if (adjustment.adjustmentType === 'theft') {
              animal.status = 'sold'; // Or create a new status for theft
              animal.statusReason = 'Stolen/Lost';
            }
            animal.isActive = false;
            animal.statusDate = new Date();
            await animal.save();
          }
        }
      }
      
      // Update adjustment status
      adjustment.approvalStatus = 'approved';
      adjustment.approvalDate = new Date();
      adjustment.approvedBy = userId;
      await adjustment.save();
      
      return adjustment;
    } catch (error) {
      console.error('Error applying inventory adjustment:', error);
      throw error;
    }
  },
  
  // Get inventory adjustments
  getInventoryAdjustments: async (farmId, userId, filters = {}) => {
    try {
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
      
      // Apply filters
      if (filters.adjustmentType) {
        query.adjustmentType = filters.adjustmentType;
      }
      
      if (filters.inventoryType) {
        query.inventoryType = filters.inventoryType;
      }
      
      if (filters.approvalStatus) {
        query.approvalStatus = filters.approvalStatus;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
          query.createdAt.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.createdAt.$lte = new Date(filters.dateTo);
        }
      }
      
      const adjustments = await InventoryAdjustment.find(query)
        .populate({
          path: 'inventoryItem',
          select: 'tagNumber name productName',
        })
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean();
      
      return adjustments;
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      throw error;
    }
  },
  
  // =================== DASHBOARD & REPORTS ===================
  
  // Get inventory dashboard
  getInventoryDashboard: async (farmId, userId) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get all statistics in parallel
      const [
        productStats,
        animalStats,
        saleStats,
        recentSales,
        pendingAdjustments,
        lowStockProducts,
        expiringProducts,
      ] = await Promise.all([
        inventoryService.getProductInventoryStatistics(farmId, userId),
        inventoryService.getAnimalInventoryStatistics(farmId, userId),
        inventoryService.getSaleStatistics(farmId, userId, 'month'),
        Sale.find({ farm: farmId, isActive: true })
          .sort({ saleDate: -1 })
          .limit(5)
          .populate({
            path: 'items.item',
            select: 'tagNumber name productName',
          })
          .lean(),
        InventoryAdjustment.find({ 
          farm: farmId, 
          approvalStatus: 'pending' 
        })
          .populate({
            path: 'inventoryItem',
            select: 'tagNumber name productName',
          })
          .limit(5)
          .lean(),
        ProductInventory.find({
          farm: farmId,
          status: 'available',
          quantity: { $lt: 5 }, // Low stock threshold
          isActive: true,
        })
          .populate('animalType', 'name')
          .limit(5)
          .lean(),
        ProductInventory.find({
          farm: farmId,
          status: 'available',
          expiryDate: { 
            $gte: new Date(),
            $lte: new Date(new Date().setDate(new Date().getDate() + 7)),
          },
          isActive: true,
        })
          .populate('animalType', 'name')
          .limit(5)
          .lean(),
      ]);
      
      const dashboard = {
        overview: {
          totalAnimals: animalStats.totalAnimals,
          totalProducts: productStats.totalProducts,
          totalInventoryValue: productStats.totalValue + animalStats.estimatedTotalValue,
          monthlyRevenue: saleStats.totalRevenue,
          pendingAdjustments: pendingAdjustments.length,
        },
        
        alerts: {
          lowStock: lowStockProducts.length,
          expiringSoon: expiringProducts.length,
          pendingAdjustments: pendingAdjustments.length,
        },
        
        recentActivity: {
          sales: recentSales,
          adjustments: pendingAdjustments,
        },
        
        statistics: {
          products: productStats,
          animals: animalStats,
          sales: saleStats,
        },
        
        quickActions: [
          { action: 'add_product', label: 'Add Product to Inventory' },
          { action: 'create_sale', label: 'Record a Sale' },
          { action: 'adjust_inventory', label: 'Make Inventory Adjustment' },
          { action: 'view_low_stock', label: 'View Low Stock Items' },
        ],
      };
      
      return dashboard;
    } catch (error) {
      console.error('Error fetching inventory dashboard:', error);
      throw error;
    }
  },
  
  // Get inventory valuation report
  getInventoryValuationReport: async (farmId, userId) => {
    try {
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: farmId,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get all products with value
      const products = await ProductInventory.find({
        farm: farmId,
        status: 'available',
        isActive: true,
      })
        .populate('animalType', 'name')
        .lean();
      
      // Get all animals with estimated value
      const animals = await Animal.find({
        farm: farmId,
        status: 'alive',
        isActive: true,
      })
        .populate('animalType', 'name')
        .lean();
      
      // Calculate values
      const productValuation = products.map(product => ({
        type: 'product',
        id: product._id,
        name: product.productName,
        productType: product.productType,
        animalType: product.animalType?.name || 'N/A',
        quantity: product.quantity,
        unit: product.unit,
        unitPrice: product.unitPrice || 0,
        totalValue: product.quantity * (product.unitPrice || 0),
      }));
      
      const animalValuation = animals.map(animal => {
        let estimatedValue = 0;
        if (animal.weight?.value) {
          // Simple estimation based on weight and type
          const basePricePerKg = {
            'Rabbit': 500,
            'Chicken': 400,
            'Cow': 300,
            'Goat': 450,
            'Sheep': 450,
          };
          const animalTypeName = animal.animalType?.name || 'Unknown';
          const pricePerKg = basePricePerKg[animalTypeName] || 300;
          estimatedValue = animal.weight.value * pricePerKg;
        }
        
        return {
          type: 'animal',
          id: animal._id,
          name: animal.name || animal.tagNumber,
          tagNumber: animal.tagNumber,
          animalType: animal.animalType?.name || 'Unknown',
          gender: animal.gender,
          age: animal.dateOfBirth ? 
            Math.floor((new Date() - new Date(animal.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365)) : 'Unknown',
          weight: animal.weight?.value || 0,
          estimatedValue,
        };
      });
      
      const totalProductValue = productValuation.reduce((sum, item) => sum + item.totalValue, 0);
      const totalAnimalValue = animalValuation.reduce((sum, item) => sum + item.estimatedValue, 0);
      const totalInventoryValue = totalProductValue + totalAnimalValue;
      
      return {
        summary: {
          totalProductValue,
          totalAnimalValue,
          totalInventoryValue,
          productCount: productValuation.length,
          animalCount: animalValuation.length,
        },
        products: productValuation,
        animals: animalValuation,
        valuationDate: new Date(),
      };
    } catch (error) {
      console.error('Error generating inventory valuation report:', error);
      throw error;
    }
  },
};

module.exports = inventoryService;