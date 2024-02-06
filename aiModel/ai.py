import pickle
from sklearn.neural_network import MLPRegressor
from flask import Flask, request, jsonify

app = Flask(__name__)

# Function to train the model and save it to a file
def train_model_and_save(training_data, model_file_path):
    # Train the neural network
    model = MLPRegressor(hidden_layer_sizes=(10, ), activation='relu', solver='adam', max_iter=1000)
    model.fit(training_data['X'], training_data['y'])

    # Save the trained model to a file
    with open(model_file_path, 'wb') as model_file:
        pickle.dump(model, model_file)
    print(f"Trained model saved to {model_file_path}")

# Function to load the trained model and make predictions
def predict_soil_moisture(model_file_path, input_data):
    # Load the trained model from the file
    with open(model_file_path, 'rb') as model_file:
        model = pickle.load(model_file)

    # Make predictions using the trained model
    predictions = model.predict(input_data)
    return predictions

@app.route('/trainModelAndSave', methods=['POST'])
def predictSaveRoute():
    data = request.json
    model_file_path = 'trained_model.pkl'
    train_model_and_save(data, model_file_path)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    input_data = data['input_data']
    model_file_path = 'trained_model.pkl'
    print(input_data)
    predictions = predict_soil_moisture(model_file_path, [input_data])
    return jsonify({'predictions': predictions.tolist()})

if __name__ == '__main__':
    # Example training data (replace this with your actual training data)
    training_data = {
        'X': [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        'y': [10, 20, 30]
    }
    model_file_path = 'trained_model.pkl'

    # Train the model and save it to a file
    train_model_and_save(training_data, model_file_path)

    # Start Flask app
    app.run(debug=True)
