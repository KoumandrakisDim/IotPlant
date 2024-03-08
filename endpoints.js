const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');
const User = require('./models/user');
const SensorData = require('./models/sensorData');
const WeatherData = require('./models/weatherData');

const Plant = mongoose.model('Plant', { user_id: String, device_id: String, status: String, name: String });
const axios = require('axios');

// const dotenv = require('dotenv');
// const result = dotenv.config();
// const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');

let lastMoistureValue = 0;
var filteredWeatherData = [];

async function endpoints(app) {
    // const weatherApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

    app.use(bodyParser.json());

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

        if (!username || !password) {
            return res.status(400).send('Username and password are required.');
        }

        try {
            const user = await User.findOne({ username });

            if (user && await user.comparePassword(password)) {
                req.session.user = user; // Store user information in the session

                
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

    app.get('/dashboard', (req, res) => {
        // Check if the user is authenticated
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to the login page if not authenticated
        }

        // Render the dashboard page
        res.render('dashboard');
    });
    app.post('/devices/create', async (req, res) => {
        try {
            // Ensure to use the correct approach to create an ObjectId
            // const objectId = mongoose.Types.ObjectId(req.params.id);
            console.log(req)
            const result = await Plant.create({
                name: req.body.name, user_id: req.session.user,
                status: 'Ok', device_id: req.body.device_id
            });

            return res.status(200).send('Device created successfully');

        } catch (error) {
            console.error('Error creating device:', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    app.delete('/devices/delete/:id', async (req, res) => {
        try {
            // Ensure to use the correct approach to create an ObjectId
            // const objectId = mongoose.Types.ObjectId(req.params.id);

            const result = await Plant.deleteOne({ device_id: req.params.id });

            if (result.deletedCount === 1) {
                return res.status(200).send('Device deleted successfully');
            } else {
                return res.status(404).send('Device not found');
            }
        } catch (error) {
            console.error('Error deleting device:', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    app.get('/user/:userId/devices', async (req, res) => {
        const userId = req.params.userId;

        try {
            // Retrieve devices for the specified user
            const devices = await Plant.find({ user_id: userId });

            // Send the devices as JSON
            res.json(devices);
        } catch (error) {
            console.error('Error retrieving devices:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    //save data
    app.post('/api/sensor-data', async (req, res) => {
        const { value } = req.body;

        try {
            // Save the sensor data to the database
            const newSensorData = new SensorData({ value });
            await newSensorData.save();

            res.status(200).send('Data received and saved.');
        } catch (error) {
            console.error('Error saving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.post('/api/saveWeatherData', async (req, res) => {
        const { data } = req.body;

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


    // Route to retrieve latest sensor data
    app.post('/api/getSensorData/:id', async (req, res) => {
        try {
            const deviceId = req.params.id;
            const { timeWindow, isFirstCall } = req.body; // Assuming the timeWindow parameter is passed in the request body

            let query = { device_id: deviceId };
            // Adjust the query based on the timeWindow parameter
            if (timeWindow === 'year') {
                query.timestamp = { $gte: new Date(new Date().getFullYear(), 0, 1) };
            } else if (timeWindow === 'month') {
                query.timestamp = { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) };
            } else if (timeWindow === 'week') {
                query.timestamp = { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) };
            } else if (timeWindow === 'day') {
                query.timestamp = { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) };
            } else if (timeWindow === 'hour') {
                query.timestamp = { $gte: new Date(new Date() - 60 * 60 * 1000) };
            } else if (timeWindow === 'max') {
                query.timestamp = {};
            } else if (timeWindow === 'realTime') {
                // Fetch the last 50 data points (assuming timestamp is sorted in descending order)
                const latestData = await SensorData.find({ device_id: deviceId })
                    .sort({ timestamp: -1 }) // Descending order for most recent first
                    .limit(50);

                // Reverse the order in your application code
                const reversedData = latestData.reverse();

                lastMoistureValue = latestData[0].value;

                return res.json(reversedData);
            }
            const sensorData = await SensorData.find(query);


            res.json(sensorData);


        } catch (error) {
            console.error('Error retrieving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.post('/getWeather', async (req, res) => {

        const { user } = req.body;

        let response;
        try {

            if (user.latitude && user.longitude) {
                response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${user.latitude}&lon=${user.longitude}&units=metric&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            else if (user.city) {

                response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${user.city}&units=metric&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            const data = response.data.list;
            filteredWeatherData = filterWeatherVariables2(data);


            res.json(response.data);


        } catch (error) {
            console.log(error)
            // res.status(error.response.status).json(error.response.data);
        }
    });

    app.post('/sensorData', async (req, res) => {
        const { sensorData } = req.body;

        let responseData = 'ok'; // Assuming you have some data to send back

        try {
            const sensorData = new SensorData({ device_id: 'g', value: req.body.value });

            // Save the sensor data to the database
            sensorData.save()
                .then(() => {
                    // console.log('Sensor data saved to the database');
                })
                .catch((error) => {
                    console.error('Error saving sensor data to the database:', error);
                });
            // Process the request and generate the response data

            // Send the response data back to the client
            res.json(responseData);
        } catch (error) {
            // Handle any errors that occurred during processing
            console.error('Error processing request:', error);
            res.status(500).json({ error: 'Internal Server Error' });
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

    app.post('/api/trainAIModel', async (req, res) => {
        try {

            trainModelAndSave();

        } catch (error) {
            res.status(500).send('Internal Server Error');
        }
    });

    app.get('/testConnectivity', async (req, res) => {
        try {

            // Send predictions as response
            res.status(200).json({ status: 'Ok' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/predictMoisture', async (req, res) => {
        try {

            let predictedMoisture = await predictMoisture(filteredWeatherData, lastMoistureValue);

            // Send predictions as response
            res.status(200).json({ predictedMoisture });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    /**
     * 
     * @param {*} forecastData 
     * @param {*} initialSoilMoisture 
     */
    async function predictMoisture(forecastData, initialSoilMoisture) {

        const modelPath = "super_ai3.pkl";

        const forecastDataString = JSON.stringify(forecastData);

        const spawn = require("child_process").spawn;
        console.log(forecastDataString)
        console.log(initialSoilMoisture)

        const pythonProcess = spawn('python', ["predict4.py", forecastDataString, initialSoilMoisture, modelPath]);

        
        return new Promise(function (resolve, reject) {

            pythonProcess.stdout.on('data', (data) => {
                console.log('python response')
                console.log(data.toString())

                resolve(data.toString())
            });
        });

    }



}
module.exports = { endpoints };
