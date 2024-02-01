const socketIo = require('socket.io');
const SensorData = require('./models/sensorData');

function setupWebSocket(server) {
    const io = socketIo(server, {
        transports: ['websocket', 'polling'],
    });

    io.on('connection', (socket) => {
        console.log('Client connected');

        const intervalId = setInterval(() => {
            const moistureData = Math.random() * 100;
            var currentdate = new Date().toLocaleString()
            const data = { value: moistureData, timeStamp: currentdate };

            const sensorData = new SensorData({ device_id: 'a', value: moistureData });

            // Save the sensor data to the database
            sensorData.save()
                .then(() => {
                    // console.log('Sensor data saved to the database');
                })
                .catch((error) => {
                    console.error('Error saving sensor data to the database:', error);
                });

            socket.emit('moistureUpdate', data);
        }, 3000);

        socket.on('disconnect', () => {
            console.log('Client disconnected');
            clearInterval(intervalId);
        });
    });
}

module.exports = { setupWebSocket };
