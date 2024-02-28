import pickle
from sklearn.neural_network import MLPRegressor
# from flask import Flask, request, jsonify

# app = Flask(__name__)

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
import pandas as pd
import pickle
import json

def merge_sensor_and_weather_data(sensor_data, weather_data):
    # Convert timestamp to date
    sensor_data['date'] = pd.to_datetime(sensor_data['timestamp']).dt.date
    weather_data['date'] = pd.to_datetime(weather_data['timestamp']).dt.date
    
    # Merge sensor and weather data based on the date
    merged_data = pd.merge(sensor_data, weather_data, on='date', how='inner')
    
    # Drop the 'date' column as it's no longer needed
    merged_data.drop(columns=['date'], inplace=True)
    
    return merged_data

def train_model_and_save(training_data, model_file_path):
    print(training_data)

    # Extract features and target variable
    X = training_data[['temperature', 'humidity', 'wind_speed']]
    y = training_data['value']
    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Preprocess numerical features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train the model
    model = MLPRegressor(hidden_layer_sizes=(10, ), activation='relu', solver='adam', max_iter=1000)
    model.fit(X_train_scaled, y_train)

    # Evaluate the model
    train_score = model.score(X_train_scaled, y_train)
    test_score = model.score(X_test_scaled, y_test)
    print(f"Training R^2 score: {train_score:.2f}")
    print(f"Testing R^2 score: {test_score:.2f}")
    
    # Save the trained model to a file
    with open(model_file_path, 'wb') as model_file:
        pickle.dump(model, model_file)
    print(f"Trained model saved to {model_file_path}")

def load_data_from_json(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def preprocess_sensor_data(sensor_data):
    for item in sensor_data:
        item['timestamp'] = pd.to_datetime(item['timestamp']['$date'])
    return pd.DataFrame(sensor_data)

sensor_data = load_data_from_json('sensordatas.json')
# Preprocess sensor data
sensor_df = preprocess_sensor_data(sensor_data)
weatherdatas_data = load_data_from_json('weatherdatas.json')
# Preprocess sensor data
weather_df = preprocess_sensor_data(weatherdatas_data)

# Merge sensor and weather data
merged_data = merge_sensor_and_weather_data(sensor_df, weather_df)
print(merged_data)
model_file_path = "trained_model.pkl"
train_model_and_save(merged_data, model_file_path)

# Function to load the trained model and make predictions
def predict_soil_moisture(model_file_path, input_data):
    # Load the trained model from the file
    with open(model_file_path, 'rb') as model_file:
        model = pickle.load(model_file)

    # Make predictions using the trained model
    predictions = model.predict(input_data)
    return predictions

# @app.route('/trainModelAndSave', methods=['POST'])
# def predictSaveRoute():
#     data = request.json
#     model_file_path = 'trained_model.pkl'
#     train_model_and_save(data, model_file_path)

# @app.route('/predict', methods=['POST'])
# def predict():
#     data = request.json
#     input_data = data['input_data']
#     model_file_path = 'trained_model.pkl'
#     print(input_data)
#     predictions = predict_soil_moisture(model_file_path, [input_data])
#     return jsonify({'predictions': predictions.tolist()})

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
    # app.run(debug=True)
