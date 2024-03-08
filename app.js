const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const path = require('path');
const ejs = require('ejs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartPlant';
const cors = require('cors');
const socketIo = require('socket.io');
require('dotenv').config();

// const { setupWebSocket } = require('./setupWebsocket');
const { endpoints } = require('./endpoints');
// const { arduinoWebsocket } = require('./arduinoWebsocket');
// const { aiModel } = require('./aiModel/ai');

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
const io = socketIo(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'TsifsaMotre',
    resave: false,
    saveUninitialized: true,
}));
app.use(express.json());

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

// Start the server

// Setup WebSocket
// setupWebSocket(server);
// initializeApp(app, db);
endpoints(app);
// arduinoCommunication.arduinoData('Test data from main app');
