const { validationModule, validateApiKey } = require('../validation');
const SensorData = require('../models/sensorData');
const Plant = require('../models/device');
const axios = require('axios');
const bodyParser = require('body-parser');
const { getFilteredWeatherData, getSaveRealTimeData, getUserData } = require('./userController');
const User = require('../models/user');
const { spawn } = require('child_process');

const deviceIPs = {};
let saveRealTimeData;

var devicesArray = [];

const twilio = require('twilio');
const accountSid = process.env.SMS_accountSid;
const authToken = process.env.SMS_TOKEN;
const twilioPhoneNumber = '+12569801284';
const client = twilio(accountSid, authToken);

async function deviceController(app) {

    validationModule(app);

    app.post('/devices/create', async (req, res) => {
        console.log(req.body)
        let minMoisture = parseInt(req.body.minMoisture) || 50;
        let maxMoisture = parseInt(req.body.maxMoisture) || 100;
        let sampleRate = parseInt(req.body.sampleRate) || 20000;
        let rootZoneDepth = parseInt(req.body.rootZoneDepth) || 20;

        try {
            validateDeviceFields(minMoisture, maxMoisture, sampleRate, res);
            const result = await Plant.create({
                name: req.body.name, user_id: req.session.user,
                status: 'Not connected', device_id: req.body.device_id,
                min_moisture: minMoisture, max_moisture: maxMoisture, rootZoneDepth: rootZoneDepth,
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
            let rootZoneDepth = parseInt(req.body.rootZoneDepth) || 20;

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
                    device_id: deviceId, name: req.body.name,
                    min_moisture: minMoisture, max_moisture: maxMoisture, rootZoneDepth: rootZoneDepth,
                    location: location, sampleRate: sampleRate, 
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
            let filter = {};
            if (req.body._search) {
                const searchField = req.body.searchField;
                const searchString = req.body.searchString;
                const searchOper = req.body.searchOper;
    
                if (searchField && searchString && searchOper) {
                    switch (searchOper) {
                        case 'eq':
                            filter[searchField] = searchString;
                            break;
                        case 'cn':
                            filter[searchField] = { $regex: searchString, $options: 'i' };
                            break;
                    }
                }
            }
    
            let query = Plant.find({ user_id: userId });
            if (Object.keys(filter).length > 0) {
                query = query.where(filter);
            }
    
            const sortField = req.body.sidx || 'device_id';
            const sortOrder = req.body.sord || 'asc';
            query = query.sort({ [sortField]: sortOrder });
    
            const page = parseInt(req.body.page) || 1;
            const rows = parseInt(req.body.rows) || 15;
    
            const totalRecords = await Plant.countDocuments({ user_id: userId, ...filter }).exec();
            const totalPages = Math.ceil(totalRecords / rows);
    
            query = query.skip((page - 1) * rows).limit(rows);
    
            const devices = await query.exec();
    
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
    
            res.json({
                page: page,
                total: totalPages,
                records: totalRecords,
                rows: devicesWithDeleteButton
            });
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
            // Step 2: Fetch the latest 50 sensor data entries for each device
            const sensorData = await Promise.all(deviceIds.map(async deviceId => {
                return await SensorData.find({ device_id: deviceId })
                    .sort({ timestamp: -1 })
                    .limit(50);
            }));

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
            const now = new Date();
            let pipeline = [
                { $match: { device_id: deviceId } }
            ];

            let matchStage = {};
            if (timeWindow === 'year') {
                matchStage = { timestamp: { $gte: new Date(Date.UTC(now.getFullYear(), 0, 1)) } };
            } else if (timeWindow === 'month') {
                matchStage = { timestamp: { $gte: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)) } };
            } else if (timeWindow === 'week') {
                matchStage = { timestamp: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
            } else if (timeWindow === 'day') {
                matchStage = { timestamp: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } };
            } else if (timeWindow === 'hour') {
                matchStage = { timestamp: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } };
            } else if (timeWindow === 'realtime') {
                // For real-time, get the last 50 documents
                pipeline.push(
                    { $sort: { timestamp: -1 } },
                    { $limit: 50 }
                );
            } else {
                return res.status(400).send('Invalid timeWindow specified');
            }

            if (timeWindow !== 'realTime') {
                pipeline.push(
                    { $match: matchStage },
                    { $sort: { timestamp: -1 } } // Sort documents by timestamp in ascending order
                );

                let numberOfBins = 50;
                pipeline.push(
                    {
                        $bucketAuto: {
                            groupBy: "$timestamp",
                            buckets: numberOfBins,
                            output: {
                                moisture: { $avg: "$moisture" },
                                humidity: { $avg: "$humidity" },
                                temperature: { $avg: "$temperature" },
                                timestamp: { $min: "$timestamp" }
                            }
                        }
                    }
                );
            }

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

        const moistureArray = req.body.moistureArray;
        const devices = req.body.devices;
        try {
            const filteredArray = moistureArray.filter(element => element !== null && element !== undefined);
            const filteredWeather = getFilteredWeatherData(); // Assuming this function is defined elsewhere
            let i = -1;
   
            const predictedMoistureArray = await Promise.all(filteredArray.map(async moistureValue => {
                if (moistureValue) {
                    i++;
                    try {
                        return await predictMoisture(filteredWeather, moistureValue, devices[i].rootZoneDepth, devices[i].min_moisture);
                    } catch (error) {
                        console.error(`Error predicting moisture: ${error}`);
                        return null;
                    }
                }
                return null;
            }));

            console.log(predictedMoistureArray);
            res.status(200).json({ predictedMoistureArray });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    async function predictMoisture(forecastData, initialSoilMoisture, rootZoneDepth, wilting_point) {

        return new Promise((resolve, reject) => {
            const forecastDataString = JSON.stringify(forecastData);

            const pythonProcess = spawn('python', ["./aiModel/predict_soil_moisture.py", forecastDataString, initialSoilMoisture, rootZoneDepth, wilting_point]);

            pythonProcess.stdout.on('data', (data) => {
                console.log('python response');
                resolve(data.toString());
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
                reject(data.toString());
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(`Python process exited with code ${code}`);
                }
            });

            pythonProcess.stdin.write(JSON.stringify({
                forecastData: forecastData,
                initialSoilMoisture: initialSoilMoisture,
                rootZoneDepth: rootZoneDepth, 
                wilting_point: wilting_point
            }));
            pythonProcess.stdin.end();
        });
    }
}


module.exports = { deviceController };
