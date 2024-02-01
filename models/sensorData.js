const mongoose = require('mongoose');

const SensorDataSchema = new mongoose.Schema({
  value: Number,
  timestamp: { type: Date, default: Date.now },
  device_id: String
});
const SensorData = mongoose.model('SensorData', SensorDataSchema);

module.exports = SensorData;
