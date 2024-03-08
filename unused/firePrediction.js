
const { PythonShell } = require('python-shell');
const bodyParser = require('body-parser');

async function main() {
    const forecastData = {
        'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],
        'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],
        'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]
    };
    const forecastDataString = JSON.stringify(forecastData);

    const initialSoilMoisture = 40;
    const modelPath = "super_ai.pkl";

    const spawn = require("child_process").spawn;
    const pythonProcess = spawn('python', ["predict3.py", forecastDataString, initialSoilMoisture, modelPath]);

    pythonProcess.stdout.on('data', (data) => {
        console.log('python response')
        console.log(data.toString())
    });
}



main();