import json
import pandas as pd
import joblib
import sys

def load_model_and_scaler(model_path, scaler_path):
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return model, scaler

def predict_evapotranspiration(forecast_data, current_soil_moisture, model, scaler):
    weather_df = pd.DataFrame(forecast_data)
    
    # Combine current soil moisture with weather data
    weather_df['current_soil_moisture'] = current_soil_moisture
    
    # Ensure consistency: Convert DataFrame to numpy array
    forecast_features = weather_df[['current_soil_moisture', 'Air temperature (C)', 'Air humidity (%)', 'Wind speed (Km/h)', 'solar_radiation', 'temp_min', 'temp_max']].values
    
    # Scale the forecast data
    forecast_scaled = scaler.transform(forecast_features)
    
    # Predict evapotranspiration for all days at once
    evapotranspiration_pred = model.predict(forecast_scaled)
    
    # Calculate soil moisture for each day
    moisture_array = [current_soil_moisture - evapotranspiration_pred[0]]
    for i in range(1, len(evapotranspiration_pred)):
        predicted_moisture = moisture_array[-1] - evapotranspiration_pred[i]
        moisture_array.append(predicted_moisture)
    
    predictions_dict = {'predictedMoisture': moisture_array, 'predictedEvapotranspiration': evapotranspiration_pred.tolist()}
    return predictions_dict

if __name__ == "__main__":

    forecast_data = {
        'Air temperature (C)': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
        'Wind speed (Km/h)':[ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
        'Air humidity (%)': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
        "pop":[1, 0.2, 1, 1, 1, 1],
        "rain":[12, 12, 15, 14, 13, 2],
        'solar_radiation': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
        'temp_min': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
        'temp_max': [ 19.8825, 21.09625, 23.82625, 24.73625, 8.81875, 25.0925 ],

            }
    
    model_path = "gradient_boosting_model.pkl"
    initial_soil_moisture = 95
    scaler_path = "scaler.pkl"

    # forecast_data = json.loads(sys.argv[1])
    # initial_soil_moisture = float(sys.argv[2])
    # model_path = sys.argv[3]
    # scaler_path = sys.argv[4]


    # Predict soil moisture for the next 14 days
    model, scaler = load_model_and_scaler(model_path, scaler_path)
    predictions = predict_evapotranspiration(forecast_data, initial_soil_moisture, model, scaler)
    print(json.dumps(predictions))
    print(predictions)

    # Print the predicted soil moisture for the next 14 days
    print("Predicted soil moisture for the next 14 days:", predictions)