// src/modules/animals/operations/feeds/feed.routes.js
const express = require('express');
const router = express.Router();

// Import feed controller functions
const {
  createFeedRecord,
  getFeedRecord,
  updateFeedRecord,
  deleteFeedRecord,
  markFeedAsCompleted,
  markFeedAsMissed,
  getAnimalFeedRecords,
  getAnimalFeedSummary,
  getTodaysFeedsForAnimal
} = require('./feed.controller');

// Import feed schedule controller functions
const {
  createFeedSchedule,
  getAnimalFeedSchedules,
  getFarmFeedSchedules,
  updateFeedSchedule,
  deleteFeedSchedule
} = require('./feedSchedule.controller');

// Import other controllers - check if they export individual functions or objects
const feedCostAnalyticsController = require('./feedCostAnalytics.controller');
const feedAlertsController = require('./feedAlerts.controller');

const {
  upsertFeedInventory,  // Was addFeedInventory
  getFarmInventory,     // Was getFarmFeedInventory
  updateInventoryItem,  // Was updateFeedInventory
  deleteInventoryItem,  // Was deleteFeedInventory
  getLowInventoryAlerts // Added this one
} = require('./feedInventory.controller');

const {
  generateFeedConsumptionReport,  // Was getFeedConsumptionReport
  generateInventoryReport,         // Maybe you want this one too
  downloadReport                   // For downloads
} = require('./feedReports.controller');

// All feed routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// ===== CORE FEED RECORDS =====
router.post('/', createFeedRecord); // POST /feeds
router.get('/:feedId', getFeedRecord); // GET /feeds/:feedId
router.put('/:feedId', updateFeedRecord); // PUT /feeds/:feedId
router.delete('/:feedId', deleteFeedRecord); // DELETE /feeds/:feedId
router.patch('/:feedId/complete', markFeedAsCompleted); // PATCH /feeds/:feedId/complete
router.patch('/:feedId/missed', markFeedAsMissed); // PATCH /feeds/:feedId/missed

// Animal-specific feed routes
router.get('/animal/:animalId', getAnimalFeedRecords); // GET /feeds/animal/:animalId
router.get('/animal/:animalId/summary', getAnimalFeedSummary); // GET /feeds/animal/:animalId/summary
router.get('/animal/:animalId/today', getTodaysFeedsForAnimal); // GET /feeds/animal/:animalId/today

// ===== FEED COST ANALYTICS =====
// Check if these are functions or objects
if (typeof feedCostAnalyticsController.getAnimalFeedCostAnalytics === 'function') {
  router.get('/animal/:animalId/analytics/cost', feedCostAnalyticsController.getAnimalFeedCostAnalytics);
}
if (typeof feedCostAnalyticsController.getFarmFeedCostAnalytics === 'function') {
  router.get('/farm/:farmId/analytics/cost', feedCostAnalyticsController.getFarmFeedCostAnalytics);
}

// ===== FEED SCHEDULES =====
router.post('/schedules', createFeedSchedule); // POST /feeds/schedules
router.get('/schedules/animal/:animalId', getAnimalFeedSchedules); // GET /feeds/schedules/animal/:animalId
router.get('/schedules/farm/:farmId', getFarmFeedSchedules); // GET /feeds/schedules/farm/:farmId
router.put('/schedules/:scheduleId', updateFeedSchedule); // PUT /feeds/schedules/:scheduleId
router.delete('/schedules/:scheduleId', deleteFeedSchedule); // DELETE /feeds/schedules/:scheduleId

// ===== FEED INVENTORY =====
router.post('/inventory', upsertFeedInventory);
router.get('/inventory/farm/:farmId', getFarmInventory);
router.put('/inventory/:inventoryId', updateInventoryItem);
router.delete('/inventory/:inventoryId', deleteInventoryItem);

// Optional: low-inventory alerts
router.get('/inventory/farm/:farmId/alerts', getLowInventoryAlerts);

// ===== FEED ALERTS =====
// Check if these are functions or objects
if (feedAlertsController && typeof feedAlertsController.getFeedAlerts === 'function') {
  router.get('/alerts/farm/:farmId', feedAlertsController.getFeedAlerts);
}
if (feedAlertsController && typeof feedAlertsController.getMissedFeedingsAlerts === 'function') {
  router.get('/alerts/farm/:farmId/missed-feedings', feedAlertsController.getMissedFeedingsAlerts);
}

// ===== FEED REPORTS =====
router.get('/reports/farm/:farmId/consumption', generateFeedConsumptionReport);
router.get('/reports/farm/:farmId/inventory', generateInventoryReport);
// Optionally expose download endpoint
// router.get('/reports/download/:reportId', downloadReport);

module.exports = router;