// const brain = require('brain.js');
// const fs = require('fs');

// function trainModelAndSave(trainingData, modelFilePath) {
//     modelFilePath = '../aiModel/data';
//     // Function to train the model and save it to a file
//     const trainModel = (trainingData, modelFilePath) => {
//         // Create and train the neural network
//         const net = new brain.NeuralNetwork();
//         net.train(trainingData);

//         // Save the trained model to a file
//         const trainedModel = net.toJSON();
//         fs.writeFileSync(modelFilePath, JSON.stringify(trainedModel));
//         console.log(`Trained model saved to ${modelFilePath}`);
//     };


//     // Train the model and save it to a file
//     trainModel(trainingData, 'trained_model.json');
// }
// const predict = (modelFilePath, inputData) => {
//     // Load the pre-trained model from the file
//     const modelData = fs.readFileSync(modelFilePath, 'utf8');
//     const net = new brain.NeuralNetwork().fromJSON(JSON.parse(modelData));

//     // Make predictions using the trained model
//     const predictions = net.run(inputData);

//     return predictions;
// };
// function predictSoilMoisture(data) {
//     const predictions = predict('trained_model.json', inputData);
//     console.log('Predictions:', predictions);
//     return predictions;
// }

// module.exports = { trainModelAndSave, predictSoilMoisture };


