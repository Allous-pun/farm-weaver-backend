// src/modules/animals/operations/health-vaccination/health.routes.js
const express = require('express');
const router = express.Router();

// Import controllers
const {
  createHealthRecord,
  getAnimalHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  markHealthRecordResolved,
  deleteHealthRecord,
  getAnimalHealthSummary,
  getHealthAlerts,
} = require('./healthRecord.controller');

const {
  createVaccinationRecord,
  getAnimalVaccinationRecords,
  getVaccinationRecord,
  updateVaccinationRecord,
  deleteVaccinationRecord,
  getAnimalVaccinationSummary,
  getVaccinationAlerts,
  markReminderSent,
} = require('./vaccinationRecord.controller');

// All health routes require authentication
const authMiddleware = require('../../../../middlewares/auth.middleware');
router.use(authMiddleware);

// ===== HEALTH RECORDS =====
router.post('/health', createHealthRecord); // POST /health
router.get('/health/animal/:animalId', getAnimalHealthRecords); // GET /health/animal/:animalId
router.get('/health/:recordId', getHealthRecord); // GET /health/:recordId
router.put('/health/:recordId', updateHealthRecord); // PUT /health/:recordId
router.patch('/health/:recordId/resolve', markHealthRecordResolved); // PATCH /health/:recordId/resolve
router.delete('/health/:recordId', deleteHealthRecord); // DELETE /health/:recordId
router.get('/health/animal/:animalId/summary', getAnimalHealthSummary); // GET /health/animal/:animalId/summary
router.get('/health/alerts/farm/:farmId', getHealthAlerts); // GET /health/alerts/farm/:farmId

// ===== VACCINATION RECORDS =====
router.post('/vaccinations', createVaccinationRecord); // POST /vaccinations
router.get('/vaccinations/animal/:animalId', getAnimalVaccinationRecords); // GET /vaccinations/animal/:animalId
router.get('/vaccinations/:recordId', getVaccinationRecord); // GET /vaccinations/:recordId
router.put('/vaccinations/:recordId', updateVaccinationRecord); // PUT /vaccinations/:recordId
router.delete('/vaccinations/:recordId', deleteVaccinationRecord); // DELETE /vaccinations/:recordId
router.get('/vaccinations/animal/:animalId/summary', getAnimalVaccinationSummary); // GET /vaccinations/animal/:animalId/summary
router.get('/vaccinations/alerts/farm/:farmId', getVaccinationAlerts); // GET /vaccinations/alerts/farm/:farmId
router.patch('/vaccinations/:recordId/reminder-sent', markReminderSent); // PATCH /vaccinations/:recordId/reminder-sent

// ===== COMBINED HEALTH DASHBOARD =====
router.get('/dashboard/animal/:animalId', async (req, res) => {
  try {
    const userId = req.userId;
    const { animalId } = req.params;
    
    // Import services
    const healthRecordService = require('./healthRecord.service');
    const vaccinationRecordService = require('./vaccinationRecord.service');
    
    // Get both health and vaccination summaries
    const [healthSummary, vaccinationSummary] = await Promise.all([
      healthRecordService.getAnimalHealthSummary(animalId, userId),
      vaccinationRecordService.getAnimalVaccinationSummary(animalId, userId),
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        health: healthSummary,
        vaccinations: vaccinationSummary,
        overallStatus: {
          health: healthSummary.animal.healthStatus,
          vaccinationCompliance: calculateVaccinationCompliance(vaccinationSummary),
          needsAttention: determineNeedsAttention(healthSummary, vaccinationSummary),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching health dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch health dashboard',
    });
  }
});

// Helper functions
function calculateVaccinationCompliance(vaccinationSummary) {
  const { overdue, upcomingDue } = vaccinationSummary.summary;
  if (overdue.length > 0) return 'poor';
  if (upcomingDue.length > 0) return 'fair';
  return 'good';
}

function determineNeedsAttention(healthSummary, vaccinationSummary) {
  const needs = [];
  
  if (healthSummary.summary.ongoingIssues > 0) {
    needs.push('ongoing_health_issues');
  }
  
  if (vaccinationSummary.summary.overdue.length > 0) {
    needs.push('overdue_vaccinations');
  }
  
  if (vaccinationSummary.summary.upcomingDue.length > 0) {
    needs.push('upcoming_vaccinations');
  }
  
  return needs;
}

module.exports = router;