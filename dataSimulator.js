const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;

app.use(express.static(__dirname + '/public'));

// Serve the HTML page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// WebSocket connection
io.on('connection', (socket) => {
    console.log('Client connected');

    // Simulate data stream
    setInterval(() => {
        const moistureData = Math.random() * 100; // Simulate soil moisture data
        socket.emit('moistureUpdate', moistureData);
    }, 5000); // Adjust the interval based on your desired update frequency

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
