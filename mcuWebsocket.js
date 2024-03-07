const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');

const SensorData = require('./models/sensorData');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3001; // Use the port provided by Heroku or default to 3001

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); // Parse JSON bodies

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Endpoint to receive data from NodeMCU
app.post('/nodemcu-data', (req, res) => {
    const moistureData = parseFloat(req.body.moistureData);
    const sensorData = new SensorData({ device_id: 'nodeMCU', value: moistureData });

    sensorData.save()
        .then(() => {
            io.emit('moistureUpdate', moistureData);
            res.sendStatus(200);
        })
        .catch((error) => {
            console.error('Error saving sensor data to the database:', error);
            res.status(500).send('Error saving sensor data to the database');
        });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
