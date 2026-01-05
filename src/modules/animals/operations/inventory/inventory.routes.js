const express = require('express');
const router = express.Router();
const inventoryController = require('./inventory.controller');

// All inventory routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// =================== PRODUCT INVENTORY ROUTES ===================
router.post('/products', inventoryController.addProductToInventory); // POST /inventory/products
router.get('/farm/:farmId/products', inventoryController.getProductInventory); // GET /inventory/farm/:farmId/products
router.get('/farm/:farmId/products/statistics', inventoryController.getProductInventoryStatistics); // GET /inventory/farm/:farmId/products/statistics
router.put('/products/:productId', inventoryController.updateProductInventory); // PUT /inventory/products/:productId

// =================== ANIMAL INVENTORY ROUTES ===================
router.get('/farm/:farmId/animals', inventoryController.getAnimalInventory); // GET /inventory/farm/:farmId/animals
router.get('/farm/:farmId/animals/statistics', inventoryController.getAnimalInventoryStatistics); // GET /inventory/farm/:farmId/animals/statistics

// =================== SALES ROUTES ===================
router.post('/sales', inventoryController.createSale); // POST /inventory/sales
router.get('/farm/:farmId/sales', inventoryController.getSales); // GET /inventory/farm/:farmId/sales
router.get('/sales/:saleId', inventoryController.getSaleById); // GET /inventory/sales/:saleId
router.patch('/sales/:saleId/payment', inventoryController.updateSalePayment); // PATCH /inventory/sales/:saleId/payment
router.get('/farm/:farmId/sales/statistics', inventoryController.getSaleStatistics); // GET /inventory/farm/:farmId/sales/statistics

// =================== INVENTORY ADJUSTMENT ROUTES ===================
router.post('/adjustments', inventoryController.createInventoryAdjustment); // POST /inventory/adjustments
router.patch('/adjustments/:adjustmentId/apply', inventoryController.applyInventoryAdjustment); // PATCH /inventory/adjustments/:adjustmentId/apply
router.get('/farm/:farmId/adjustments', inventoryController.getInventoryAdjustments); // GET /inventory/farm/:farmId/adjustments

// =================== DASHBOARD & REPORTS ===================
router.get('/farm/:farmId/dashboard', inventoryController.getInventoryDashboard); // GET /inventory/farm/:farmId/dashboard
router.get('/farm/:farmId/valuation-report', inventoryController.getInventoryValuationReport); // GET /inventory/farm/:farmId/valuation-report

// =================== UTILITY ROUTES ===================
router.get('/product-types', inventoryController.getProductTypes); // GET /inventory/product-types
router.get('/adjustment-types', inventoryController.getAdjustmentTypes); // GET /inventory/adjustment-types
router.get('/sale-types', inventoryController.getSaleTypes); // GET /inventory/sale-types
router.get('/buyer-types', inventoryController.getBuyerTypes); // GET /inventory/buyer-types

module.exports = router;