const bcrypt = require('bcryptjs');
const User = require('../models/user');
const bodyParser = require('body-parser');
const { validationModule } = require('../validation');
const WeatherData = require('../models/weatherData');
const axios = require('axios');
let filteredWeatherData;
const express = require('express');
const session = require('express-session');

async function userController(app) {

    validationModule(app);


    app.post('/register', async (req, res) => {
        const { username, password, device_id } = req.body;

        if (!username || !password || !device_id) {
            return res.status(400).send('Username, password, and device ID are required.');
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 5);

            const userObject = { username: username, password: hashedPassword };
            // Create a user
            const user = new User(userObject);
            await user.save();
            return res.json({ userId: user._id, message: 'Login successful' });
        } catch (error) {
            console.error('Error during registration:', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    app.post('/login', async (req, res) => {
        const { username, password } = req.body;
        console.log(req.body)
        if (!username || !password) {
            return res.status(400).send('Username and password are required.');
        }

        try {
            const user = await User.findOne({ username });
            console.log(user)
            if (user && await user.comparePassword(password)) {
                req.session.user = user; // Store user information in the session
                saveRealTimeData = user.toggleSaveSensorData;

                // You can also send the user's ID as part of the response if needed
                return res.json({ userId: user._id, user: user, message: 'Login successful', port: process.env.PORT || 3000 });
            } else {
                console.log('Invalid credentials for username:', username);
                return res.status(401).send('Invalid username or password.');
            }
        } catch (error) {
            console.error('Error during login:', error);
            return res.status(500).send('Internal Server Error');
        }
    });


    app.get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) {
                console.error('Error during logout:', err);
                return res.status(500).send('Internal Server Error');
            }
            return res.status(200).send('Logged out successfully');
        });
    });

    //edit profile
    app.post('/api/user/editProfile', async (req, res) => {
        try {
            const { data } = req.body;

            if (!data || !data.id || !data.username) {
                return res.status(400).send('Invalid request body');
            }

            const updatedUser = await User.findOneAndUpdate(
                { _id: data.id }, // Query condition
                { name: data.username, city: data.city, useWeather: data.useWeather }, // Update fields
                { new: true } // Return the updated document
            );

            if (!updatedUser) {
                return res.status(404).send('User not found');
            }

            res.status(200).send('Profile updated successfully.');
        } catch (error) {
            console.error('Error saving user data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.post('/getWeather', async (req, res) => {

        const { user } = req.body;
        console.log(user)
        let response;
        if (!user) {
            return res.status(400).send('User info required.');
        }

        try {

            if (user.latitude && user.longitude) {
                response = await axios.get(`https://api.openweathermap.org/data/3.0/onecall?lat=${user.latitude}&lon=${user.longitude}&units=metric&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            else if (user.city) {
                let coordinates;

                coordinates = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${user.city}&limit=1&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
                response = await axios.get(`https://api.openweathermap.org/data/3.0/onecall?lat=${coordinates.data[0].lat}&lon=${coordinates.data[0].lon}&units=metric&exclude=current,minutely,hourly&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            const data = response.data.list;
            // filteredWeatherData = filterWeatherVariables2(data);
            filteredWeatherData = data;


            res.json(response.data);


        } catch (error) {
            console.log(error)

            return res.status(500).send(error);

            // res.status(error.response.status).json(error.response.data);
        }
    });



    app.post('/api/saveWeatherData', async (req, res) => {
        const { data } = req.body;
        console.log(data)
        try {
            // Save the weather data to the database
            const weatherDataEntries = data.weatherData.map(entry => {
                return {
                    humidity: entry.humidity,
                    temperature: entry.temp,
                    wind_speed: entry.wind,
                    city: data.city,
                };
            });

            await WeatherData.insertMany(weatherDataEntries);

            res.status(200).send('Data received and saved.');
        } catch (error) {
            console.error('Error saving weather data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    function filterWeatherVariables2(hourlyForecast) {
        const dailyData = {};

        hourlyForecast.forEach(hourlyData => {
            const date = new Date(hourlyData.dt * 1000).toLocaleDateString('en-US');
            if (!dailyData[date]) {
                dailyData[date] = {
                    temp: [],
                    wind_speed: [],
                    humidity: []
                };
            }
            dailyData[date].temp.push(hourlyData.main.temp);
            dailyData[date].wind_speed.push(hourlyData.wind.speed);
            dailyData[date].humidity.push(hourlyData.main.humidity);
        });

        // Calculate average for each day
        const forecastData = {
            'Air temperature (C)': [],
            'Wind speed (Km/h)': [],
            'Air humidity (%)': []
        };

        for (const date in dailyData) {
            if (dailyData.hasOwnProperty(date)) {
                const tempSum = dailyData[date].temp.reduce((acc, curr) => acc + curr, 0);
                const windSpeedSum = dailyData[date].wind_speed.reduce((acc, curr) => acc + curr, 0);
                const humiditySum = dailyData[date].humidity.reduce((acc, curr) => acc + curr, 0);
                const numDataPoints = dailyData[date].temp.length;
                const avgTemp = tempSum / numDataPoints;
                const avgWindSpeed = windSpeedSum / numDataPoints;
                const avgHumidity = humiditySum / numDataPoints;

                forecastData['Air temperature (C)'].push(avgTemp);
                forecastData['Wind speed (Km/h)'].push(avgWindSpeed);
                forecastData['Air humidity (%)'].push(avgHumidity);
            }
        }

        return forecastData;
    }
}
function getFilteredWeatherData() {
    return filteredWeatherData;
}
module.exports = { userController, getFilteredWeatherData };
