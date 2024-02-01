const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { SerialPort } = require('serialport');

const SensorData = require('./models/sensorData');

const app = express();
const server = http.createServer(app);  // Use the http server created by Express
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000", // Adjust this to your app's origin
        methods: ["GET", "POST"]
    }
});
const PORT = 3001;

app.use(express.static(__dirname + '/public'));

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// SerialPort connection
const portOptions = {
    path: 'COM3',
    baudRate: 9600,
};

const port = new SerialPort(portOptions);

// Handle data received from the serial port
port.on('data', (data) => {
    const moistureData = parseFloat(data.toString()); // Convert the data to a floating-point number
    // console.log(`Data received from Arduino: ${moistureData}`);
    const sensorData = new SensorData({ device_id: 'g', value: moistureData });

    // Save the sensor data to the database
    sensorData.save()
        .then(() => {
            // console.log('Sensor data saved to the database');
        })
        .catch((error) => {
            console.error('Error saving sensor data to the database:', error);
        });

    // Emit the Arduino data to connected WebSocket clients
    io.emit('moistureUpdate', moistureData);
});

// Handle errors that may occur during communication
port.on('error', (err) => {
    console.error('Error:', err.message);
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
