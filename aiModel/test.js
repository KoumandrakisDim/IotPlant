const { spawn } = require('child_process');

// Path to the Python script
const pythonProcess = spawn('python', ["../aiModel/predict_soil_moisture.py"]);

return new Promise(function (resolve, reject) {

    pythonProcess.stdout.on('data', (data) => {
        console.log('python response')
        console.log(data.toString())

        resolve(data.toString())
    });
});
// Spawn a new child process to run the Python script
// const pythonProcess = spawn('python', [scriptPath]);

pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
