const { validationModule, validateApiKey } = require('./validation');
const SensorData = require('./models/sensorData');
const Plant = require('./models/device');
const axios = require('axios');
let lastMoistureValue = 0;
const bodyParser = require('body-parser');
let deviceId;
const { getFilteredWeatherData, getSaveRealTimeData, getUserData } = require('./controllers/userController');
const User = require('./models/user');

const deviceIPs = {};
let saveRealTimeData;

var devicesArray = [];

// const twilio = require('twilio');
// const accountSid = process.env.SMS_accountSid;
// const authToken = process.env.SMS_TOKEN;
// const twilioPhoneNumber = '+12569801284';
// const client = twilio(accountSid, authToken);

async function deviceController(app) {

    validationModule(app);

    app.post('/devices/create', async (req, res) => {
        console.log(req.body)
        let minMoisture = parseInt(req.body.minMoisture) || 50;
        let maxMoisture = parseInt(req.body.maxMoisture) || 100;
        let sampleRate = parseInt(req.body.sampleRate) || 20000;

        try {
            validateDeviceFields(minMoisture, maxMoisture, sampleRate, res);
            const result = await Plant.create({
                name: req.body.name, user_id: req.session.user,
                status: 'Not connected', device_id: req.body.device_id,
                min_moisture: minMoisture, max_moisture: maxMoisture,
                location: req.body.location, sampleRate: sampleRate
            });

            return res.status(200).send('Device created successfully');

        } catch (error) {
            console.error('Error creating device:', error);
            return res.status(500).send('Internal Server Error');
        }
    });
    function validateDeviceFields(minMoisture, maxMoisture, sampleRate) {
        const errors = [];

        if (minMoisture < 0 || minMoisture > 100) {
            errors.push('Invalid minMoisture. 0 - 100');
        }
        if (maxMoisture < 0 || maxMoisture > 100) {
            errors.push('Invalid maxMoisture. 0 - 100');
        }
        if (sampleRate < 1 || sampleRate > 1000) {
            errors.push('Invalid sampleRate. 1 - 1000');
        }

        return errors;
    }

    app.post('/devices/edit', validateApiKey, async (req, res) => {
        try {
            const minMoisture = parseInt(req.body.minMoisture) || 50;
            const maxMoisture = parseInt(req.body.maxMoisture) || 100;
            const sampleRate = parseInt(req.body.sampleRate) || 20;
            const deviceId = req.body.device_id;

            const authHeader = req.headers.authorization;
            const apiKey = authHeader.split(" ")[1];

            const validationErrors = validateDeviceFields(minMoisture, maxMoisture, sampleRate);

            const location = req.body.location || "Outdoors";

            if (validationErrors.length > 0) {
                console.log(validationErrors)

                return res.status(400).json({ errors: validationErrors });
            }

            const device = await Plant.findOne({ device_id: deviceId });
            console.log(minMoisture)
            console.log(sampleRate)

            const result = await Plant.findOneAndUpdate(
                { device_id: deviceId }, // Query condition
                {
                    device_id: deviceId,
                    min_moisture: minMoisture, max_moisture: maxMoisture,
                    location: location, sampleRate: sampleRate
                },
            );



            if (device.sampleRate !== sampleRate) {
                let sampleRateResult = await setDeviceSampleRate(deviceId, sampleRate, apiKey);
                if (!sampleRateResult.success) {
                    console.warn('Failed to update sample rate on the device:', sampleRateResult.message);
                    // Optionally handle the failure, e.g., log it, notify someone, etc.
                    // But don't throw an error, so the rest of the edit process completes
                }
            }

            return res.status(200).send('Device edited successfully');

        } catch (error) {
            console.error('Error editing device:', error);
            return res.status(500).send('Internal Server Error');
        }
    });

    app.delete('/devices/delete/:id', validateApiKey, async (req, res) => {
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
            devicesArray = devices;
            // Send the devices as JSON
            deviceId = devices[devices.length - 1].device_id;

            res.json(devices);
        } catch (error) {
            console.error('Error retrieving devices:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    app.get('/devices/get/:deviceId', async (req, res) => {
        const deviceId = req.params.deviceId;
        console.log(deviceId)
        try {
            if (!deviceId) {
                return res.status(400).json({ error: 'DeviceId required' });
            }
            // Retrieve devices for the specified user
            const device = await Plant.findOne({ device_id: deviceId });
            console.log(device)
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.status(200).json(device);
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
                    minMoisture: device.min_moisture,
                    maxMoisture: device.max_moisture,
                    location: device.location,
                    sampleRate: device.sampleRate,
                    action: `<i class='bi bi-pencil text-primary' style='padding-right:10%;cursor:pointer;' onclick="devicesView.editDevice('${device.device_id}')"></i><i class='bi bi-trash text-danger' style='padding-left:10%;cursor:pointer;' onclick="deviceController.deleteDevice('${device.device_id}')"></i>`
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
    /**
     * deviceId
     * sampleRate
     * apiKey
     */
    async function setDeviceSampleRate(deviceId, sampleRate, apiKey) {
        try {
            // Check if required data is present
            if (!deviceId || !sampleRate || !apiKey) {
                throw new Error('Missing device_id, sample_rate, or apiKey');
            }

            // Perform sample_rate validation
            if (sampleRate < 1) {
                throw new Error('Given sample_rate is too low. 1 minimum');
            }

            let deviceIp = getDeviceIP(deviceId);
            if (!deviceIp) {
                throw new Error('Device not found');
            }

            console.log('sample rate updated.')


            // Make an API call to the NodeMCU device
            const response = await axios.post(`http://${deviceIp}/reprogramDevice`, {
                sampleRate: sampleRate * 1000
            }, {
                headers: {
                    'Authorization': 'API_KEY ' + apiKey // Include the API key in the request headers
                }
            });

            // Check the response status code and handle accordingly
            if (response.status === 200) {
                // API call successful, handle success response
                return { success: true, message: 'Sample rate updated successfully' };
            } else {
                // API call failed, handle error response
                throw new Error('Failed to update sample rate on the device');
            }
        } catch (error) {
            console.error('Error setting device sample rate:', error.message);
            return { success: false, message: error.message }; // Re-throw the error for the caller to handle
        }
    }

    app.post('/api/devices/getAllSensorData/:userId', async (req, res) => {
        try {
            // Assuming userId is obtained from req.body.userId
            const userId = req.params.userId;
            const devices = await Plant.find({ user_id: userId }).select('device_id');

            // Extract device IDs from the fetched devices
            const deviceIds = devices.map(device => device.device_id);
            console.log(deviceIds)
            // Step 2: Fetch the latest 50 sensor data entries for each device
            const sensorData = await Promise.all(deviceIds.map(async deviceId => {
                return await SensorData.find({ device_id: deviceId })
                    .sort({ timestamp: -1 })
                    .limit(50);
            }));
            var lastMoistureValues = [];
            sensorData.forEach(function (data) {
                lastMoistureValues.push(data[data.length - 1].moisture);
            })

            return res.json(sensorData);

        } catch (error) {
            console.error('Error retrieving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    // Route to retrieve latest sensor data
    app.post('/api/getSensorData/:id', async (req, res) => {
        const deviceId = req.params.id;
        const { timeWindow } = req.body;

        try {
            let pipeline = [
                { $match: { device_id: deviceId } },
                { $sort: { timestamp: -1 } } // Sort documents by timestamp in descending order
            ];

            const sampleSize = 50;
            // let pipeline = [];

            if (timeWindow === 'realTime' || timeWindow === 'realtime') {
                // For real-time window, get the last 50 documents
                pipeline.push({ $limit: sampleSize });
            } else {
                let matchStage = {};

                if (timeWindow === 'year') {
                    matchStage = { timestamp: { $gte: new Date(new Date().getFullYear(), 0, 1) } };
                } else if (timeWindow === 'month') {
                    matchStage = { timestamp: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } };
                } else if (timeWindow === 'week') {
                    const oneWeekAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchStage = { timestamp: { $gte: oneWeekAgo } };
                } else if (timeWindow === 'day') {
                    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
                    matchStage = { timestamp: { $gte: oneDayAgo } };
                } else if (timeWindow === 'hour') {
                    const oneHourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);
                    matchStage = { timestamp: { $gte: oneHourAgo } };
                }

                // Match the documents based on the time window
                pipeline.push({ $match: matchStage });

                // Sort documents by timestamp
                pipeline.push({ $sort: { timestamp: 1 } });

                // Use $bucketAuto to create 50 buckets based on timestamp
                pipeline.push({
                    $bucketAuto: {
                        groupBy: "$timestamp",
                        buckets: sampleSize,
                        output: {
                            moisture: { $avg: "$moisture" },
                            temperature: { $avg: "$temperature" },
                            humidity: { $avg: "$humidity" },
                            timestamp: { $first: "$timestamp" },
                        }
                    }
                });

                // Project the results to include only the fields we want
                pipeline.push({
                    $project: {
                        _id: 0,
                        moisture: 1,
                        temperature: 1,
                        humidity: 1,
                        timestamp: 1,
                    }
                });
            }

            // Perform aggregation
            let aggregatedData = await SensorData.aggregate(pipeline);
            return res.json(aggregatedData);

        } catch (error) {
            console.error('Error retrieving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });


    // devices sends data to this endpoint. get sensor data from nodeMcu and save to database
    app.post('/sensorData', validateApiKey, async (req, res) => {
        const { sensorData } = req.body;

        let responseData = ''; // Assuming you have some data to send back
        var receivedJson = req.body;
        const device_id = req.body.device_id;
        console.log(saveRealTimeData)

        try {
            let status = 'Connected';
            let sensorsWorking = 0;
            if (!('temperature' in receivedJson && 'humidity' in receivedJson)) {
                responseData = 'Temperature and humidity sensor not working';
            } else {
                sensorsWorking++;
            }
            if (!('moisture' in receivedJson) || receivedJson.moisture > 100 || receivedJson.moisture < 0) {
                responseData += 'moisture sensor not working';
                return res.status(400).json({ error: responseData });
            } else {
                sensorsWorking++;
            }

            // send notification if moisture is too low
            const savedDeviceData = devicesArray.find(item => item.device_id === device_id);

            if (getUserData().smsNotifications) {
                if (receivedJson.moisture < savedDeviceData.min_moisture) {
                    sendSMSNotification(getUserData().phoneNumber, 'Warning! Low soil moisture detected! id:' + device_id);
                }
            }
            // if (receivedJson.moisture < savedDeviceData.min_moisture) {
            //     sendWebNotification('Warning! Low soil moisture detected! id:' + device_id);
            // }

            const fieldsToSave = { device_id };

            // Loop through the request body and add all the fields to the fieldsToSave object
            for (const key in req.body) {
                // Exclude device_id as it's handled separately
                if (key !== 'device_id') {
                    fieldsToSave[key] = req.body[key];
                }
            }

            // Save the data to the database
            const sensorData = new SensorData(fieldsToSave);
            // await sensorData.save();

            // Save the sensor data to the database
            if (getSaveRealTimeData()) {

                sensorData.save()
                    .then(() => {
                        console.log('Sensor data saved to the database');
                        res.json(responseData);

                    })
                    .catch((error) => {
                        console.error('Error saving sensor data to the database:', error);
                    });
            } else {
                res.status(200).json({ error: 'Data not saved' });
            }
            // Process the request and generate the response data

            // Send the response data back to the client
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
    // device sends info here when turned on
    app.post('/api/device/getDeviceInfo', validateApiKey, async (req, res) => {
        const { ip, device_id } = req.body;
        console.log('getDeviceInfo')
        console.log(device_id)

        if (!ip || !device_id) {
            return res.status(400).json({ error: 'Missing ip or device_id' });
        }

        const result = await Plant.findOneAndUpdate(
            { device_id: device_id }, // Query condition
            {
                status: 'Connected',
            },
        );
        deviceIPs[device_id] = ip;
        // Store IP address and device ID in database or memory
        console.log(`Received IP address: ${ip}, Device ID: ${device_id}`);

        res.sendStatus(200);
    });

    // function to send SMS notification
    /**
     * 
     * @param {*} toNumber 
     * @param {*} message 
     */
    function sendSMSNotification(toNumber, message) {
        try {
            client.messages.create({
                body: message,
                from: twilioPhoneNumber,
                to: toNumber
            })
            console.log('Notification sent. SID:', message.sid);
        } catch {
            console.error('Error sending notification:', error);
        }
    };
    function sendWebNotification(message) {
        app.post('/api/send-notification', (req, res) => {
            req.body.message = message;

            res.sendStatus(200);
        });
    }
    function getDeviceIP(deviceId) {
        return deviceIPs[deviceId];
    }

    app.post('/api/predictMoisture', async (req, res) => {
        // const deviceId = req.query.device_id; // Retrieve deviceId from query parameters
        console.log('predictMoisture')
        var moistureArray = req.body.moistureArray;
        var data = req.body.data;
        // console.log(req.body)

        try {
            // if (!deviceId) {
            //     return res.status(400).json({ error: 'Missing device_id in query parameters' });
            // }

            // let lastMoistureValue = await getLastMoistureValue(deviceId);
            let filteredWeather = getFilteredWeatherData();
            var predictedMoistureArray = [];
            console.log(moistureArray)
            // console.log(data)
            const filteredArray = moistureArray.filter(element => element !== null && element !== undefined);

            try {
                // Asynchronously predict moisture for each last moisture value
                predictedMoistureArray = await Promise.all(filteredArray.map(async moistureValue => {
                    try {
                        return await predictMoisture(filteredWeather, moistureValue);
                    } catch (error) {
                        console.error(`Error predicting moisture: ${error}`);
                        return null; // Handle error gracefully
                    }
                }));
                console.log(predictedMoistureArray);
            } catch (error) {
                console.error(`Error predicting moisture: ${error}`);
            }
            console.log(filteredWeather)

            console.log('predictMoisture')

            console.log(predictedMoistureArray)
            // Send predictions as response
            res.status(200).json({ predictedMoistureArray });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    function getLastMoistureValue(deviceId) {
        // return new Promise(function (resolve, reject) {
        //     let query = { device_id: deviceId };
        //     // Assuming you have some mechanism to retrieve the last moisture value from a database or another data source
        //     // For example, querying a MongoDB collection named "moistureData"

        //     // Assuming you have a MongoDB client initialized as "mongoClient"
        //     const db = mongoClient.db('your_database_name');
        //     const collection = db.collection('moistureData');

        //     // Assuming the "moistureData" collection has documents with a "deviceId" field and a "moistureValue" field
        //     let lastMoisture = collection.findOne({ deviceId }, { sort: { _id: -1 } }); // Get the latest document for the given deviceId

        //     resolve(lastMoisture)
        // });
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



    async function validateApiKey2(req, res, next) {
        try {
            // Retrieve the Authorization header from the request
            const authHeader = req.headers.authorization;

            // Check if the Authorization header is provided
            if (!authHeader || !authHeader.startsWith("API_KEY ")) {
                return res.status(401).json({ message: "Invalid API key format" });
            }

            // Extract the API key from the Authorization header
            const api_key = authHeader.split(" ")[1];
            console.log('api_key');
            console.log(api_key);

            // Find the user with the provided API key
            try {
                const user = await User.findOne({ api_key });
                // Check if the user exists
                if (!user) {
                    return res.status(401).json({ message: "Invalid API key" });
                }

                // Attach the user object to the request for further processing
                req.user = user;

                // API key is valid, proceed to the next middleware or route handler
                next();
            } catch (error) {
                console.error('Error fetching user:', error);
                // Handle the error (e.g., return an error response)
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

}



module.exports = { deviceController };
