const { validationModule, validateApiKey } = require('./validation');
const SensorData = require('./models/sensorData');
const Plant = require('./models/device');
const axios = require('axios');
let lastMoistureValue = 0;
const bodyParser = require('body-parser');
let deviceId;
const { getFilteredWeatherData, getSaveRealTimeData } = require('./controllers/userController');
const User = require('./models/user');

const deviceIPs = {};
let saveRealTimeData;

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
            const sampleRate = parseInt(req.body.sampleRate) || 20000;
            const deviceId = req.body.device_id;

            const authHeader = req.headers.authorization;
            const apiKey = authHeader.split(" ")[1];

            const validationErrors = validateDeviceFields(minMoisture, maxMoisture, sampleRate);

            if (validationErrors.length > 0) {
                return res.status(400).json({ errors: validationErrors });
            }

            const device = await Plant.findOne({ device_id: deviceId });
            console.log(device.sampleRate)
            console.log(sampleRate)

            const result = await Plant.findOneAndUpdate(
                { device_id: req.body.device_id }, // Query condition
                {
                    device_id: deviceId,
                    min_moisture: parseInt(minMoisture), max_moisture: parseInt(maxMoisture),
                    location: req.body.location, sampleRate: parseInt(sampleRate)
                },
            );



            if (device.sampleRate !== sampleRate) {
                await setDeviceSampleRate(deviceId, sampleRate, apiKey);
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
                    action: `<i class='bi bi-pencil text-primary' style='cursor:pointer;' onclick="devicesView.editDevice('${device.device_id}')"></i><i class='bi bi-trash text-danger' style='cursor:pointer;' onclick="deviceController.deleteDevice('${device.device_id}')"></i>`
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
                console.log('sample rate updated.')
                console.log(sampleRate);
                return { success: true, message: 'Sample rate updated successfully' };
            } else {
                // API call failed, handle error response
                throw new Error('Failed to update sample rate on the device');
            }
        } catch (error) {
            console.error('Error setting device sample rate:', error.message);
            throw error; // Re-throw the error for the caller to handle
        }
    }

    // Example usage:
    // setDeviceSampleRate(data.device_id, sample_rate, apiKey);

    // app.post('/api/setDeviceSampleRate', validateApiKey, async (req, res) => {
    //     const data = req.body;
    //     const authHeader = req.headers.authorization;
    //     const sample_rate = req.body.sample_rate;

    //     const apiKey = authHeader.split(" ")[1];
    //     console.log(apiKey)

    //     try {
    //         // Check if required data is present in the request
    //         if (!data.device_id || !sample_rate) {
    //             return res.status(400).json({ error: 'Missing device_id or sample_rate' });
    //         }
    //         if (sample_rate < 1000) {
    //             return res.status(400).json({ error: 'Given sample_rate is too low. 1000 minimum' });
    //         }
    //         let deviceIp = getDeviceIP(data.device_id);
    //         deviceIPs[deviceId]

    //         if (!deviceIp) {
    //             return res.status(404).json({ error: 'Device not found' });
    //         }
    //         // Make an API call to the NodeMCU device
    //         try {
    //             const response = await axios.post(`http://${deviceIp}/reprogramDevice`, {
    //                 sampleRate: sample_rate
    //             }, {
    //                 headers: {
    //                     'Authorization': 'API_KEY ' + apiKey // Include the API key in the request headers
    //                 }
    //             });

    //             // Check the response status code and handle accordingly
    //             if (response.status === 200) {
    //                 // API call successful, handle success response
    //                 return res.status(200).json({ message: 'Sample rate updated successfully' });
    //             } else {
    //                 // API call failed, handle error response
    //                 return res.status(500).json({ error: 'Failed to update sample rate on the device' });
    //             }
    //             // Process response here
    //         } catch (error) {
    //             console.error('Error making Axios request:', error);
    //             // Handle the error appropriately
    //         }

    //     } catch (error) {
    //         console.error('Error:', error);
    //         return res.status(500).json({ error: 'Internal Server Error' });
    //     }
    // });

    // Route to retrieve latest sensor data
    app.post('/api/getSensorData/:id', async (req, res) => {

        const deviceId = req.params.id;
        const { timeWindow, isFirstCall } = req.body; // Assuming the timeWindow parameter is passed in the request body

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
            console.log(query)
            console.log(fetchedData)
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

            if (downsampledData.length > 0) {
                if ('moisture' in downsampledData[downsampledData.length - 1]) {
                    lastMoistureValue = downsampledData[downsampledData.length - 1].moisture;

                }
            }

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
        const device_id = req.body.device_id;
        console.log(saveRealTimeData)
        if (getSaveRealTimeData()) {

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
                } else {
                    sensorsWorking++;
                }

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
                sensorData.save()
                    .then(() => {
                        console.log('Sensor data saved to the database');
                        res.json(responseData);

                    })
                    .catch((error) => {
                        console.error('Error saving sensor data to the database:', error);
                    });

                // Process the request and generate the response data

                // Send the response data back to the client
            } catch (error) {
                // Handle any errors that occurred during processing
                console.error('Error processing request:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        } else {
            res.status(200).json({ error: 'Data not saved' });
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


    function getDeviceIP(deviceId) {
        return deviceIPs[deviceId];
    }

    app.get('/api/predictMoisture', async (req, res) => {
        // const deviceId = req.query.device_id; // Retrieve deviceId from query parameters
        console.log('predictMoisture')

        try {
            // if (!deviceId) {
            //     return res.status(400).json({ error: 'Missing device_id in query parameters' });
            // }

            // let lastMoistureValue = await getLastMoistureValue(deviceId);
            let filteredWeather = getFilteredWeatherData();
            console.log('predictMoisture')

            console.log(filteredWeather)
            console.log(lastMoistureValue)

            let predictedMoisture = await predictMoisture(filteredWeather, lastMoistureValue);
            console.log(predictedMoisture)
            // Send predictions as response
            res.status(200).json({ predictedMoisture });
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
