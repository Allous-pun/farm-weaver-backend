// src/modules/animals/operations/feeds/feedSchedule.service.js
const FeedSchedule = require('./feedSchedule.model');

class FeedScheduleService {
  async createSchedule(scheduleData) {
    return await FeedSchedule.create(scheduleData);
  }

  async getAnimalSchedules(animalId) {
    return await FeedSchedule.find({ animal: animalId });
  }

  async getFarmSchedules(farmId) {
    return await FeedSchedule.find({ farm: farmId })
      .populate('animal', 'name tagNumber')
      .populate('feedType', 'name unitPrice');
  }

  async updateSchedule(scheduleId, updateData) {
    return await FeedSchedule.findByIdAndUpdate(
      scheduleId,
      updateData,
      { new: true }
    );
  }

  async deleteSchedule(scheduleId) {
    return await FeedSchedule.findByIdAndDelete(scheduleId);
  }

  async findById(scheduleId) {
    return await FeedSchedule.findById(scheduleId);
  }
}

module.exports = new FeedScheduleService();