
const User = require('./models/user');
const WeatherData = require('./models/weatherData');

const axios = require('axios');

// const dotenv = require('dotenv');
// const result = dotenv.config();
// const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');

var filteredWeatherData = [];
let saveRealTimeData = true;

async function endpoints(app) {
    // const weatherApiKey = process.env.OPEN_WEATHER_MAP_API_KEY;

    app.use(bodyParser.json());

    app.get('/dashboard', (req, res) => {
        // Check if the user is authenticated
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to the login page if not authenticated
        }

        // Render the dashboard page
        res.render('dashboard');
    });

    app.post('/api/saveWeatherData', async (req, res) => {
        const { data } = req.body;

        try {
            // Save the weather data to the database
            const weatherDataEntries = data.weatherData.map(entry => {
                return {
                    humidity: entry.humidity,
                    temperature: entry.temp,
                    wind_speed: entry.wind,
                    city: data.city,
                };
            });

            await WeatherData.insertMany(weatherDataEntries);

            res.status(200).send('Data received and saved.');
        } catch (error) {
            console.error('Error saving weather data:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.post('/getWeather', async (req, res) => {

        const { user } = req.body;

        let response;
        try {

            if (user.latitude && user.longitude) {
                response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${user.latitude}&lon=${user.longitude}&units=metric&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            else if (user.city) {

                response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${user.city}&units=metric&appid=${process.env.OPEN_WEATHER_MAP_API_KEY}`);
            }
            const data = response.data.list;
            filteredWeatherData = filterWeatherVariables2(data);


            res.json(response.data);


        } catch (error) {
            console.log(error)
            // res.status(error.response.status).json(error.response.data);
        }
    });

    function filterWeatherVariables2(hourlyForecast) {
        const dailyData = {};

        hourlyForecast.forEach(hourlyData => {
            const date = new Date(hourlyData.dt * 1000).toLocaleDateString('en-US');
            if (!dailyData[date]) {
                dailyData[date] = {
                    temp: [],
                    wind_speed: [],
                    humidity: []
                };
            }
            dailyData[date].temp.push(hourlyData.main.temp);
            dailyData[date].wind_speed.push(hourlyData.wind.speed);
            dailyData[date].humidity.push(hourlyData.main.humidity);
        });

        // Calculate average for each day
        const forecastData = {
            'Air temperature (C)': [],
            'Wind speed (Km/h)': [],
            'Air humidity (%)': []
        };

        for (const date in dailyData) {
            if (dailyData.hasOwnProperty(date)) {
                const tempSum = dailyData[date].temp.reduce((acc, curr) => acc + curr, 0);
                const windSpeedSum = dailyData[date].wind_speed.reduce((acc, curr) => acc + curr, 0);
                const humiditySum = dailyData[date].humidity.reduce((acc, curr) => acc + curr, 0);
                const numDataPoints = dailyData[date].temp.length;
                const avgTemp = tempSum / numDataPoints;
                const avgWindSpeed = windSpeedSum / numDataPoints;
                const avgHumidity = humiditySum / numDataPoints;

                forecastData['Air temperature (C)'].push(avgTemp);
                forecastData['Wind speed (Km/h)'].push(avgWindSpeed);
                forecastData['Air humidity (%)'].push(avgHumidity);
            }
        }

        return forecastData;
    }

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
