// src/modules/animals/operations/health-vaccination/vaccinationRecord.service.js
const VaccinationRecord = require('./vaccinationRecord.model');
const Animal = require('../../animalRecords/animal.model');
const Farm = require('../../../farms/farm.model');
const AnimalType = require('../../../animalTypes/animalType.model');

class VaccinationRecordService {
  // Create vaccination record
  async createVaccinationRecord(vaccineData, userId) {
    try {
      // Verify animal exists
      const animal = await Animal.findById(vaccineData.animal);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      // Verify farm belongs to user
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Verify animal type has health vaccinations enabled
      const animalType = await AnimalType.findById(animal.animalType);
      
      if (!animalType || !animalType.features?.healthVaccinations) {
        throw new Error('Health & vaccinations module is not enabled for this animal type');
      }
      
      // Check for duplicate vaccination (same vaccine, same dose)
      const existingVaccination = await VaccinationRecord.findOne({
        animal: vaccineData.animal,
        vaccineName: vaccineData.vaccineName,
        doseNumber: vaccineData.doseNumber,
        isActive: true,
      });
      
      if (existingVaccination) {
        throw new Error(`Dose ${vaccineData.doseNumber} of ${vaccineData.vaccineName} already administered to this animal`);
      }
      
      // Add metadata
      vaccineData.farm = animal.farm;
      vaccineData.administeredBy = userId;
      
      // Create vaccination record
      const vaccinationRecord = await VaccinationRecord.create(vaccineData);
      
      return vaccinationRecord;
    } catch (error) {
      console.error('Service error creating vaccination record:', error);
      throw error;
    }
  }
  
  // Get vaccination records for an animal
  async getAnimalVaccinationRecords(animalId, userId, filters = {}) {
    try {
      // Verify animal exists and user has permission
      const animal = await Animal.findById(animalId);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Build query
      const query = { animal: animalId };
      
      // Apply filters
      if (filters.vaccineName) {
        query.vaccineName = filters.vaccineName;
      }
      
      if (filters.vaccineType) {
        query.vaccineType = filters.vaccineType;
      }
      
      // Only show active records by default
      if (filters.includeInactive !== 'true') {
        query.isActive = true;
      }
      
      // Pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const skip = (page - 1) * limit;
      
      // Get records
      const records = await VaccinationRecord.find(query)
        .sort({ dateAdministered: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Get total count
      const totalRecords = await VaccinationRecord.countDocuments(query);
      
      // Calculate vaccination status for each record
      const recordsWithStatus = records.map(record => {
        const recordObj = new VaccinationRecord(record);
        return {
          ...record,
          status: recordObj.status,
          isDue: recordObj.isDue(),
          isDueSoon: recordObj.isDueSoon(),
        };
      });
      
      return {
        records: recordsWithStatus,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit),
          hasNextPage: page * limit < totalRecords,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Service error getting animal vaccination records:', error);
      throw error;
    }
  }
  
  // Get vaccination record by ID
  async getVaccinationRecordById(recordId, userId) {
    try {
      const vaccinationRecord = await VaccinationRecord.findById(recordId);
      
      if (!vaccinationRecord) {
        return null;
      }
      
      // Verify user has permission via farm
      const farm = await Farm.findOne({
        _id: vaccinationRecord.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        return null;
      }
      
      return vaccinationRecord;
    } catch (error) {
      console.error('Service error getting vaccination record:', error);
      throw error;
    }
  }
  
  // Update vaccination record
  async updateVaccinationRecord(recordId, userId, updateData) {
    try {
      const vaccinationRecord = await this.getVaccinationRecordById(recordId, userId);
      
      if (!vaccinationRecord) {
        return null;
      }
      
      // Don't allow changing animal or farm
      if (updateData.animal || updateData.farm) {
        throw new Error('Cannot change animal or farm reference');
      }
      
      // Don't allow changing vaccine name or dose number (creates duplicate risk)
      if (updateData.vaccineName || updateData.doseNumber) {
        throw new Error('Cannot change vaccine name or dose number');
      }
      
      // Update record
      const updatedRecord = await VaccinationRecord.findByIdAndUpdate(
        recordId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );
      
      return updatedRecord;
    } catch (error) {
      console.error('Service error updating vaccination record:', error);
      throw error;
    }
  }
  
  // Delete vaccination record (soft delete)
  async deleteVaccinationRecord(recordId, userId) {
    try {
      const vaccinationRecord = await this.getVaccinationRecordById(recordId, userId);
      
      if (!vaccinationRecord) {
        return null;
      }
      
      // Soft delete
      vaccinationRecord.isActive = false;
      await vaccinationRecord.save();
      
      return vaccinationRecord;
    } catch (error) {
      console.error('Service error deleting vaccination record:', error);
      throw error;
    }
  }
  
  // Get animal vaccination summary
  async getAnimalVaccinationSummary(animalId, userId) {
    try {
      // Verify animal exists and user has permission
      const animal = await Animal.findById(animalId);
      
      if (!animal) {
        throw new Error('Animal not found');
      }
      
      const farm = await Farm.findOne({
        _id: animal.farm,
        user: userId,
        isArchived: false,
      });
      
      if (!farm) {
        throw new Error('Farm not found or you do not have permission');
      }
      
      // Get all vaccination records for the animal
      const records = await VaccinationRecord.find({
        animal: animalId,
        isActive: true,
      }).lean();
      
      // Calculate summary
      const summary = {
        totalVaccinations: records.length,
        coreVaccinations: 0,
        nonCoreVaccinations: 0,
        vaccinesAdministered: new Set(),
        upcomingDue: [],
        overdue: [],
        vaccinationSchedule: {},
      };
      
      const now = new Date();
      
      records.forEach(record => {
        // Count by type
        if (record.vaccineType === 'core') {
          summary.coreVaccinations++;
        } else {
          summary.nonCoreVaccinations++;
        }
        
        // Track unique vaccines
        summary.vaccinesAdministered.add(record.vaccineName);
        
        // Check due dates
        if (record.nextDueDate) {
          const recordObj = new VaccinationRecord(record);
          
          if (recordObj.isDue()) {
            summary.overdue.push({
              vaccineName: record.vaccineName,
              doseNumber: record.doseNumber,
              dueDate: record.nextDueDate,
              daysOverdue: Math.ceil((now - record.nextDueDate) / (1000 * 60 * 60 * 24)),
            });
          } else if (recordObj.isDueSoon()) {
            summary.upcomingDue.push({
              vaccineName: record.vaccineName,
              doseNumber: record.doseNumber,
              dueDate: record.nextDueDate,
              daysUntilDue: Math.ceil((record.nextDueDate - now) / (1000 * 60 * 60 * 24)),
            });
          }
          
          // Build vaccination schedule by vaccine
          if (!summary.vaccinationSchedule[record.vaccineName]) {
            summary.vaccinationSchedule[record.vaccineName] = [];
          }
          
          summary.vaccinationSchedule[record.vaccineName].push({
            doseNumber: record.doseNumber,
            dateAdministered: record.dateAdministered,
            nextDueDate: record.nextDueDate,
            status: recordObj.status,
          });
        }
      });
      
      // Convert Set to Array
      summary.vaccinesAdministered = Array.from(summary.vaccinesAdministered);
      
      // Sort schedule by dose number
      Object.keys(summary.vaccinationSchedule).forEach(vaccine => {
        summary.vaccinationSchedule[vaccine].sort((a, b) => a.doseNumber - b.doseNumber);
      });
      
      return {
        animal: {
          name: animal.name,
          tagNumber: animal.tagNumber,
          species: animal.species,
        },
        summary,
        records: records.slice(0, 10), // Last 10 records
      };
    } catch (error) {
      console.error('Service error getting animal vaccination summary:', error);
      throw error;
    }
  }
  
  // Get vaccination alerts for a farm
  async getVaccinationAlerts(farmId, userId) {
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
      
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Get overdue vaccinations
      const overdueVaccinations = await VaccinationRecord.find({
        farm: farmId,
        nextDueDate: { $lte: now },
        isActive: true,
        reminderSent: false,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      // Get vaccinations due soon
      const dueSoonVaccinations = await VaccinationRecord.find({
        farm: farmId,
        nextDueDate: { $gt: now, $lte: sevenDaysFromNow },
        isActive: true,
        reminderSent: false,
      })
      .populate('animal', 'name tagNumber')
      .lean();
      
      // Get animals missing core vaccinations
      const allAnimals = await Animal.find({
        farm: farmId,
        status: { $in: ['alive', 'active'] },
      }).lean();
      
      const missingVaccinations = [];
      
      // This would need to be customized based on animal type requirements
      // For now, just return empty or implement based on your specific needs
      
      return {
        overdueVaccinations,
        dueSoonVaccinations,
        missingVaccinations,
        totalAlerts: overdueVaccinations.length + dueSoonVaccinations.length + missingVaccinations.length,
        summary: {
          overdue: overdueVaccinations.length,
          dueSoon: dueSoonVaccinations.length,
          missing: missingVaccinations.length,
        },
      };
    } catch (error) {
      console.error('Service error getting vaccination alerts:', error);
      throw error;
    }
  }
  
  // Mark vaccination reminder as sent
  async markReminderSent(recordId, userId) {
    try {
      const vaccinationRecord = await this.getVaccinationRecordById(recordId, userId);
      
      if (!vaccinationRecord) {
        return null;
      }
      
      vaccinationRecord.reminderSent = true;
      vaccinationRecord.lastReminderSent = new Date();
      await vaccinationRecord.save();
      
      return vaccinationRecord;
    } catch (error) {
      console.error('Service error marking reminder as sent:', error);
      throw error;
    }
  }
}

module.exports = new VaccinationRecordService();