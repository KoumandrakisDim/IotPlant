const mongoose = require('mongoose');

const bcrypt = require('bcryptjs');
const User = require('./models/user');
const SensorData = require('./models/sensorData');
const WeatherData = require('./models/weatherData');

const Plant = mongoose.model('Plant', { user_id: String, device_id: String, status: String, name: String });
const axios = require('axios');
const crypto = require('crypto');

// const dotenv = require('dotenv');
// const result = dotenv.config();
// const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');

let lastMoistureValue = 0;
var filteredWeatherData = [];
let saveRealTimeData = true;

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
            // Retrieve username/email and password from the request body
            const { username, password } = req.body;

            // Retrieve user record from the database based on the provided username/email
            const user = await User.findOne({ username });

            // Check if user exists and compare hashed passwords
            if (user && await bcrypt.compare(password, user.passwordHash)) {
                // Passwords match, authenticate the user
                res.status(200).json({ message: "Login successful" });
            } else {
                // Invalid username/email or password
                res.status(401).json({ message: "Invalid username/email or password" });
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
    app.post('/user/:userId/devices', async (req, res) => {
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
    app.post('/user/:userId/devicesGrid', async (req, res) => {
        const userId = req.params.userId;

        try {
            // Retrieve devices for the specified user
            let devices;
            let filter = {}; // Initialize filter outside the if block
            if (req.body._search) {
                const searchField = req.body.searchField;
                const searchString = req.body.searchString;
                const searchOper = req.body.searchOper;

                if (searchField && searchString && searchOper) {
                    // Construct the filter based on the search parameters
                    switch (searchOper) {
                        case 'eq':
                            filter[searchField] = searchString;
                            break;
                        case 'cn':
                            filter[searchField] = { $regex: searchString, $options: 'i' }; // Case-insensitive search
                            break;
                        // Add other search operations as needed
                    }
                }
            }

            // Apply sorting and filtering to the devices query
            let query = Plant.find({ user_id: userId });
            if (filter) {
                query = query.where(filter);
            }

            // Determine the sort order based on the request from jqGrid
            const sortField = req.body.sidx;
            const sortOrder = req.body.sord;
            if (sortOrder === 'asc' || sortOrder === 'desc') {
                query = query.sort({ [sortField]: sortOrder }); // Set the sort order based on the request
            }

            // Execute the query and retrieve the devices
            devices = await query.exec();

            // Modify the devices data to include a column for the delete button
            const devicesWithDeleteButton = devices.map(device => {
                return {
                    user_id: device.user_id,
                    device_id: device.device_id,
                    name: device.name,
                    status: device.status,
                    deleteButton: `<i class='bi bi-trash text-danger' style='cursor:pointer;' onclick="deviceController.deleteDevice('${device.device_id}')"></i>`
                };
            });

            // Return the modified data
            res.json(devicesWithDeleteButton);
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
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

        const deviceId = req.params.id;
        const { timeWindow, isFirstCall } = req.body; // Assuming the timeWindow parameter is passed in the request body
        console.log(deviceId)
        console.log(timeWindow)

        try {

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
                // No additional filtering needed for 'max' window
            } else if (timeWindow === 'realTime') {
                // Fetch the last 50 data points (assuming timestamp is sorted in descending order)
                const latestData = await SensorData.find({ device_id: deviceId })
                    .sort({ timestamp: -1 }) // Descending order for most recent first
                    .limit(50);

                // Reverse the order in your application code
                const reversedData = latestData.reverse();

                lastMoistureValue = latestData[0].moisture;

                return res.json(reversedData);
            }

            // Filter out documents with missing or invalid timestamps
            // query.timestamp = { $gte: new Date(), $type: 'date' };
            // Fetch data based on the adjusted query
            let fetchedData = await SensorData.find(query);

            // Downsample the fetched data to a smaller set
            let downsampledData = [];
            const totalRecords = fetchedData.length;
            const sampleSize = 50; // Desired number of samples

            if (totalRecords <= sampleSize) {
                downsampledData = fetchedData; // If the total records are less than or equal to the sample size, no need for downsampling
            } else {
                const step = Math.ceil(totalRecords / sampleSize); // Calculate the step size for downsampling
                for (let i = 0; i < totalRecords; i += step) {
                    downsampledData.push(fetchedData[i]); // Select every 'step' record from the fetched data
                }
            }
            lastMoistureValue
            return res.json(downsampledData);



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

    app.post('/sensorData', validateApiKey, async (req, res) => {
        const { sensorData } = req.body;

        let responseData = ''; // Assuming you have some data to send back
        var receivedJson = req.body;

        try {
            if (!('temperature' in receivedJson && 'humidity' in receivedJson)) {
                responseData = 'Temperature and humidity sensor not working';
            }

            const sensorData = new SensorData({
                device_id: req.body.device_id, moisture: req.body.moisture,
                humidity: req.body.humidity, temperature: req.body.temperature
            });
            console.log(receivedJson)
            // Save the sensor data to the database
            if (saveRealTimeData) {
                sensorData.save()
                    .then(() => {
                        // console.log('Sensor data saved to the database');
                    })
                    .catch((error) => {
                        console.error('Error saving sensor data to the database:', error);
                    });
            }

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

    app.post('/api/generateApiKey', async (req, res) => {
        function generateApiKey(length) {
            return crypto.randomBytes(length).toString('hex');
        }

        // Generate a random API key with 32 characters (16 bytes)
        const apiKey = generateApiKey(16);
        console.log(apiKey);
        let data = req.body;
        try {
            if (!data || !data.id) {
                return res.status(400).send('Invalid request body');
            }
            console.log(data.id)
            const updatedUser = await User.findOneAndUpdate(
                { _id: data.id }, // Query condition
                { api_key: apiKey }
            );

            // Send predictions as response
            res.status(200).json({ apiKey });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/toggleSaveData', async (req, res) => {
        const data = req.body;
        console.log(data);

        try {

            if (data.flag) {
                saveRealTimeData = true;
            } else {
                saveRealTimeData = false;
            }
            await User.findOneAndUpdate(
                { _id: data.id }, // Query condition
                { toggleSaveSensorData: data.flag }
            );
            res.status(200).json({});

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
    async function validateApiKey(req, res, next) {
        try {
            // Retrieve the Authorization header from the request
            const authHeader = req.headers.authorization;

            // Check if the Authorization header is provided
            if (!authHeader || !authHeader.startsWith("API_KEY ")) {
                return res.status(401).json({ message: "Invalid API key format" });
            }

            // Extract the API key from the Authorization header
            const apiKey = authHeader.split(" ")[1];

            // Find the user with the provided API key
            const user = await User.findOne({ apiKey });

            // Check if the user exists
            if (!user) {
                return res.status(401).json({ message: "Invalid API key" });
            }

            // Attach the user object to the request for further processing
            req.user = user;

            // API key is valid, proceed to the next middleware or route handler
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }


}
module.exports = { endpoints };
