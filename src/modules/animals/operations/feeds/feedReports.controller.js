// src/modules/animals/operations/feeds/feedReports.controller.js
const feedReportsService = require('./feedReports.service');

// Generate feed consumption report
const generateFeedConsumptionReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        status: 'error',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const report = await feedReportsService.generateFeedConsumptionReport(
      farmId, 
      userId, 
      startDate, 
      endDate
    );

    // Return JSON format
    if (format === 'json') {
      return res.status(200).json({
        status: 'success',
        data: report,
      });
    }
    
    // For PDF/Excel formats, you would generate files here
    // This is a placeholder for future implementation
    res.status(200).json({
      status: 'success',
      message: `Report generated in ${format.toUpperCase()} format`,
      data: {
        reportId: `feed-report-${Date.now()}`,
        format,
        downloadUrl: `/api/animals/feeds/reports/${farmId}/download?reportId=feed-report-${Date.now()}&format=${format}`,
        preview: format === 'pdf' || format === 'excel' ? report.summary : report,
      },
    });
  } catch (error) {
    console.error('Error generating feed consumption report:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate feed consumption report',
    });
  }
};

// Generate inventory report
const generateInventoryReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId } = req.params;
    const { format = 'json' } = req.query;

    const report = await feedReportsService.generateInventoryReport(farmId, userId);

    // Return JSON format
    if (format === 'json') {
      return res.status(200).json({
        status: 'success',
        data: report,
      });
    }
    
    // For PDF/Excel formats
    res.status(200).json({
      status: 'success',
      message: `Inventory report generated in ${format.toUpperCase()} format`,
      data: {
        reportId: `inventory-report-${Date.now()}`,
        format,
        downloadUrl: `/api/animals/feeds/reports/${farmId}/download?reportId=inventory-report-${Date.now()}&format=${format}`,
        preview: format === 'pdf' || format === 'excel' ? report.summary : report,
      },
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    
    if (error.message === 'Farm not found or you do not have permission') {
      return res.status(403).json({
        status: 'error',
        message: error.message,
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to generate inventory report',
    });
  }
};

// Download report file
const downloadReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { farmId, reportId } = req.params;
    const { format = 'json' } = req.query;

    // Verify farm belongs to user
    const Farm = require('../../../farms/farm.model');
    const farm = await Farm.findOne({
      _id: farmId,
      user: userId,
      isArchived: false,
    });
    
    if (!farm) {
      return res.status(403).json({
        status: 'error',
        message: 'Farm not found or you do not have permission',
      });
    }

    // This is a placeholder - in production, you would:
    // 1. Generate PDF using libraries like pdfkit or puppeteer
    // 2. Generate Excel using libraries like exceljs
    // 3. Store files temporarily and serve them
    
    const placeholderResponse = {
      message: `Report ${reportId} in ${format} format`,
      note: 'File generation would be implemented in production',
      farmName: farm.name,
      generatedAt: new Date().toISOString(),
    };

    if (format === 'pdf') {
      // Set headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}.pdf"`);
      // Here you would send the actual PDF buffer
      return res.status(200).send(JSON.stringify(placeholderResponse));
    }
    
    if (format === 'excel') {
      // Set headers for Excel
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportId}.xlsx"`);
      // Here you would send the actual Excel buffer
      return res.status(200).send(JSON.stringify(placeholderResponse));
    }

    // Default to JSON
    res.status(200).json({
      status: 'success',
      data: placeholderResponse,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download report',
    });
  }
};

module.exports = {
  generateFeedConsumptionReport,
  generateInventoryReport,
  downloadReport,
};