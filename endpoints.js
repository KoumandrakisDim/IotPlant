
const User = require('./models/user');


// const dotenv = require('dotenv');
// const result = dotenv.config();
// const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');

var filteredWeatherData = [];
let saveRealTimeData = true;

async function endpoints(app) {
    // const weatherApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;


    app.get('/dashboard', (req, res) => {
        // Check if the user is authenticated
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to the login page if not authenticated
        }

        // Render the dashboard page
        res.render('dashboard');
    });





    app.post('/api/trainAIModel', async (req, res) => {
        try {

            trainModelAndSave();

        } catch (error) {
            res.status(500).send('Internal Server Error');
        }
    });






    app.post('/api/toggleSaveData', async (req, res) => {
        const data = req.body;
        console.log(data);

        try {

            if (data.flag) {
                saveRealTimeData = true;
            } else {
                saveRealTimeData = false;
            }
            await User.findOneAndUpdate(
                { _id: data.id }, // Query condition
                { toggleSaveSensorData: data.flag }
            );
            res.status(200).json({});

        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });





}
module.exports = { endpoints };
