// src/routes/farm.routes.js
const express = require('express');
const router = express.Router();
const {
  createFarm,
  getFarms,
  getFarm,
  updateFarm,
  archiveFarm,
  restoreFarm,
  deleteFarm,
  getDefaultFarm,
} = require('../controllers/farm.controller');

// All farm routes require authentication
const authMiddleware = require('../middlewares/auth.middleware');
router.use(authMiddleware);

// Farm routes
router.post('/', createFarm); // POST /api/farms
router.get('/', getFarms); // GET /api/farms
router.get('/default', getDefaultFarm); // GET /api/farms/default

// Farm ID routes
router.get('/:farmId', getFarm); // GET /api/farms/:farmId
router.put('/:farmId', updateFarm); // PUT /api/farms/:farmId
router.delete('/:farmId', archiveFarm); // DELETE /api/farms/:farmId (soft delete)
router.delete('/:farmId/permanent', deleteFarm); // DELETE /api/farms/:farmId/permanent (hard delete)
router.patch('/:farmId/restore', restoreFarm); // PATCH /api/farms/:farmId/restore

module.exports = router;