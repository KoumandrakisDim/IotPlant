const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  user_id: String,
  device_id: String,
  status: String,
  name: String,
  min_moisture: Number,
  max_moisture: Number,
  plantType: String,
  isOutdoors: Boolean
});
const device = mongoose.model('Device', DeviceSchema);

module.exports = device;
