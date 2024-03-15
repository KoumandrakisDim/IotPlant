const { validationModule, validateApiKey } = require('../validation');
const SensorData = require('../models/sensorData');
const Plant = require('../models/device');
const axios = require('axios');
let lastMoistureValue = 0;
const bodyParser = require('body-parser');


const deviceIPs = {};

async function deviceController(app) {

    validationModule(app);

    app.use(bodyParser.json());

    app.post('/devices/create', async (req, res) => {
        try {
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
    //get user's devices
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

    // Define the route handler for firmware updates
    app.post('/api/reprogramDevice', validateApiKey, async (req, res) => {
        const data = req.body;
        console.log(data);

        try {
            // Check if required data is present in the request
            if (!data.device_id || !data.firmware_url) {
                return res.status(400).json({ error: 'Missing device_id or firmware_url' });
            }

            // Download the firmware binary file
            const firmwarePath = path.join(__dirname, 'firmware.bin');
            await downloadFirmware(data.firmware_url, firmwarePath);

            // Now you have the firmware binary file downloaded, you can proceed to send it to the NodeMCU device
            // Here you can use libraries like 'axios' or 'node-fetch' to make an HTTP request to the NodeMCU device and send the firmware file

            // For demonstration purposes, let's assume the firmware has been successfully sent to the device
            // You may need to handle this part according to your specific device and network setup

            // Send a success response
            res.status(200).json({ message: 'Firmware update initiated successfully' });

        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/setDeviceSampleRate', validateApiKey, async (req, res) => {
        const data = req.body;
        const apiKey = req.headers.api_key;
        const sample_rate = req.body.sample_rate;

        try {
            // Check if required data is present in the request
            if (!data.device_id || !sample_rate) {
                return res.status(400).json({ error: 'Missing device_id or sample_rate' });
            }
            if (sample_rate < 1000) {
                return res.status(400).json({ error: 'Given sample_rate is too low. 1000 minimum' });
            }
            let deviceIp = getDeviceIP(data.device_id);
            console.log(deviceIp)
            if (!deviceIp) {
                return res.status(404).json({ error: 'Device not found' });
            }
            // Make an API call to the NodeMCU device
            const response = await axios.post(`http://${deviceIp}/reprogramDevice`, {
                sampleRate: sample_rate
            }, {
                headers: {
                    'API_KEY ': apiKey // Include the API key in the request headers
                }
            });


            // Check the response status code and handle accordingly
            if (response.status === 200) {
                // API call successful, handle success response
                return res.status(200).json({ message: 'Sample rate updated successfully' });
            } else {
                // API call failed, handle error response
                return res.status(500).json({ error: 'Failed to update sample rate on the device' });
            }

        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ error: 'Internal Server Error' });
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
                if (latestData[0]) {
                    lastMoistureValue = reversedData[reversedData.length - 1].moisture;

                }

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
            lastMoistureValue = downsampledData[downsampledData.length - 1].moisture;
            return res.json(downsampledData);



        } catch (error) {
            console.error('Error retrieving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // get sensor data from nodeMcu and save to database
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

    app.post('/api/device/getDeviceInfo', validateApiKey, (req, res) => {
        const { data } = req.body;
        console.log(data);

        if (!data.device_id || !data.ip) {
            return res.status(400).json({ error: 'Missing device_id or ip' });
        }
        deviceIPs[data.ip] = data.device_id;
        // Store IP address in database or memory
        console.log(`Received IP address: ${data.ip}`);

        res.sendStatus(200);
    });

    function getDeviceIP(deviceId) {
        return deviceIPs[deviceId];
    }

    app.get('/api/predictMoisture', validateApiKey, async (req, res) => {
        const deviceId = req.query.device_id; // Retrieve deviceId from query parameters

        try {
            if (!deviceId) {
                return res.status(400).json({ error: 'Missing device_id in query parameters' });
            }

            let lastMoistureValue = await getLastMoistureValue(deviceId);

            let predictedMoisture = await predictMoisture(filteredWeatherData, lastMoistureValue);

            // Send predictions as response
            res.status(200).json({ predictedMoisture });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    function getLastMoistureValue(deviceId) {
        return new Promise(function (resolve, reject) {
            let query = { device_id: deviceId };
            // Assuming you have some mechanism to retrieve the last moisture value from a database or another data source
            // For example, querying a MongoDB collection named "moistureData"

            // Assuming you have a MongoDB client initialized as "mongoClient"
            const db = mongoClient.db('your_database_name');
            const collection = db.collection('moistureData');

            // Assuming the "moistureData" collection has documents with a "deviceId" field and a "moistureValue" field
            let lastMoisture = collection.findOne({ deviceId }, { sort: { _id: -1 } }); // Get the latest document for the given deviceId

            resolve(lastMoisture)
        });
    }

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



module.exports = { deviceController };
