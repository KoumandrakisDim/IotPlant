const mongoose = require('mongoose');

const WeatherDataSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    temperature: Number,
    humidity: Number,
    wind_speed: Number,
    city: String
});
const WeatherData = mongoose.model('weatherData', WeatherDataSchema);

module.exports = WeatherData;
