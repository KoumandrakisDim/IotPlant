const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  moisture: Number,
  humidity: Number,
  temperature: Number,
  timestamp: { type: Date, default: Date.now },
  device_id: String
});
const SensorData = mongoose.model('SensorData', SensorDataSchema);

module.exports = SensorData;
