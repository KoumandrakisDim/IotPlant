const { SerialPort } = require('serialport');

// Specify the path and baud rate in the options object
const portOptions = {
  path: 'COM3',
  baudRate: 9600,
};

// Create a new SerialPort instance
const port = new SerialPort(portOptions);

// Handle data received from the serial port
port.on('data', (data) => {
  console.log(`Data received: ${data.toString()}`);
});

// Handle errors that may occur during communication
port.on('error', (err) => {
  console.error('Error:', err.message);
});
