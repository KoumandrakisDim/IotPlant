const mongoose = require('mongoose');

const bcrypt = require('bcrypt');
const User = require('./models/user');
const SensorData = require('./models/sensorData');
const Plant = mongoose.model('Plant', { user_id: String, device_id: String, status: String, name: String });

function endpoints(app) {
    app.post('/register', async (req, res) => {
        const { username, password, device_id } = req.body;
        console.log('register')
        if (!username || !password || !device_id) {
            return res.status(400).send('Username, password, and device ID are required.');
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 5);
            console.log(hashedPassword);
            const userObject = { username: username, password: hashedPassword };
            // Create a user
            const user = new User(userObject);
            await user.save();
            console.log(user);
            // Create a plant device associated with the user
            const plant = new Plant({ user_id: user._id, device_id, status: 'OK' });
            await plant.save();
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
                console.log('User logged in:', user);

                // You can also send the user's ID as part of the response if needed
                return res.json({ userId: user._id, message: 'Login successful' });
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

    // Route to retrieve latest sensor data
    app.post('/api/getSensorData/:id', async (req, res) => {
        try {
            // Retrieve the latest sensor data from the database
            const latestData = await SensorData.find({device_id: req.params.id});

            res.json(latestData);
        } catch (error) {
            console.error('Error retrieving sensor data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    

}
module.exports = { endpoints };
