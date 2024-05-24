const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const ejs = require('ejs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const mongoURI = process.env.MONGODB_URI || 'mongodb://0.0.0.0:27017/smartPlant';
const cors = require('cors');
const socketIo = require('socket.io');
require('dotenv').config();
const mqtt = require('mqtt');

const app = express();

app.use(session({
    secret: 'TsifsaMotre',
    resave: false,
    saveUninitialized: true,
}));

// const { setupWebSocket } = require('./setupWebsocket');
const { endpoints } = require('./endpoints');
const { deviceController } = require('./deviceController');
const { userController } = require('./controllers/userController');
app.use(bodyParser.json());

endpoints(app);
deviceController(app);
userController(app);

// const { arduinoWebsocket } = require('./arduinoWebsocket');
// const { aiModel } = require('./aiModel/ai');

app.use(cors());

// dos attack
const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });
const db = mongoose.connection;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index');
});

db.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
});

const limiter = rateLimit({
    store: new MongoStore({ uri: mongoURI }),
    max: 100,
    windowMs: 15 * 60 * 1000,
    message: "Too many requests from this IP, please try again later."
});

// Apply the rate limiter middleware to all requests
app.use(limiter);

// MQTT broker connection options
const mqttOptions = {
    host: process.env.MQTT_HOST || 'your_mqtt_broker_address',
    port: process.env.MQTT_PORT || 1883,
    clientId: 'mqtt_api_client',
    username: process.env.MQTT_USERNAME || 'your_mqtt_username',
    password: process.env.MQTT_PASSWORD || 'your_mqtt_password'
};


// Connect to MQTT broker
const mqttClient = mqtt.connect(mqttOptions);

// Handle MQTT connection events
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
});

mqttClient.on('error', (error) => {
    console.error('MQTT error:', error);
});

// API endpoint to send MQTT request to device
app.post('/sendMqttRequest', (req, res) => {
    const deviceId = req.body.deviceId;
    const message = req.body.message;

    // Publish message to device topic
    mqttClient.publish(`devices/${deviceId}`, message, (err) => {
        if (err) {
            console.error('Error publishing MQTT message:', err);
            res.status(500).json({ error: 'Failed to send MQTT request' });
        } else {
            console.log('MQTT message published');
            res.status(200).json({ message: 'MQTT request sent successfully' });
        }
    });
});