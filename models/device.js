const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  user_id: String,
  device_id: String,
  status: String,
  name: String,
  min_moisture: Number,
  max_moisture: Number,
  rootZoneDepth: Number,
  plantType: String,
  location: String,
  sampleRate: Number,
  sensorsWorking: Number
});
const device = mongoose.model('Plant', DeviceSchema);

module.exports = device;
