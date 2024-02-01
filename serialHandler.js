// serialHandler.js

const { SerialPort } = require('serialport');
const { EventEmitter } = require('events');

class SerialHandler extends EventEmitter {
    constructor() {
        super();

        const portOptions = {
            path: 'COM3',
            baudRate: 9600,
        };

        this.port = new SerialPort(portOptions);

        this.port.on('data', (data) => {
            const moistureData = parseFloat(data.toString()); // Convert the data to a floating-point number
            console.log(`Data received from Arduino: ${moistureData}`);

            // Emit the Arduino data as a custom event
            this.emit('moistureUpdate', moistureData);
        });

        this.port.on('error', (err) => {
            console.error('Error:', err.message);
        });
    }

    close() {
        this.port.close();
    }
}

module.exports = SerialHandler;
