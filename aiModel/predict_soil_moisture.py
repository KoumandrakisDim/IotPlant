import json
import pandas as pd
import joblib
import sys

def load_model_and_scaler(model_path, scaler_path):
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return model, scaler

def predict_evapotranspiration(forecast_data, current_soil_moisture, root_zone_depth, wilting_point, model, scaler):
    weather_df = pd.DataFrame(forecast_data)
    
    # Combine current soil moisture with weather data
    weather_df['current_soil_moisture'] = current_soil_moisture
    
    # Ensure consistency: Convert DataFrame to numpy array
    forecast_features = weather_df[['current_soil_moisture', 'Air temperature (C)', 'Air humidity (%)', 'Wind speed (Km/h)', 'solar_radiation', 'temp_min', 'temp_max']].values
    
    # Scale the forecast data
    forecast_scaled = scaler.transform(forecast_features)
    
    # Predict evapotranspiration for all days at once
    evapotranspiration_pred = model.predict(forecast_scaled)
    moisture_reduction_percentage_list = []
    
    field_capacity = 40
        
    # Calculate soil moisture for each day
    moisture_array = [current_soil_moisture]
    for i in range(len(evapotranspiration_pred)):
        # apply K_s empirical factor. soil_moisture affects ET
        if moisture_array[i] > field_capacity:
            K_s = 1
        elif moisture_array[i] < wilting_point:
            K_s = 0
        else:
            K_s = ((moisture_array[i] - wilting_point) / (field_capacity - wilting_point)) ** 0.5
        ET_actual = evapotranspiration_pred[i] * K_s
        
        # Convert root zone depth to water holding capacity (mm)
        water_holding_capacity = 15 / 10  # 15 mm water per 10 cm of soil
        total_water_available = water_holding_capacity * root_zone_depth
        
        # Calculate soil moisture reduction percentage
        moisture_reduction_percentage = (ET_actual / total_water_available) * 100
        moisture_reduction_percentage_list.append(moisture_reduction_percentage)
        
        # Update the soil moisture
        predicted_moisture = moisture_array[-1] - moisture_reduction_percentage
        moisture_array.append(predicted_moisture)
    
    # Remove the initial current soil moisture value from the array to match predicted values count
    moisture_array.pop(0)
    
    predictions_dict = {
        'predictedMoisture': moisture_array,
        'predictedEvapotranspiration': moisture_reduction_percentage_list
    }
    
    return predictions_dict

if __name__ == "__main__":
    forecast_data = json.loads(sys.argv[1])
    initial_soil_moisture = float(sys.argv[2])
    root_zone_depth = float(sys.argv[3])
    wilting_point = float(sys.argv[3])

    # forecast_data = {
    #     'Air temperature (C)': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
    #     'Wind speed (Km/h)':[ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
    #     'Air humidity (%)': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
    #     "pop":[1, 0.2, 1, 1, 1, 1],
    #     "rain":[12, 12, 15, 14, 13, 2],
    #     'solar_radiation': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
    #     'temp_min': [ 19.8825, 5.09625, 30.82625, 24.73625, 5.81875, 25.0925 ],
    #     'temp_max': [ 19.8825, 21.09625, 23.82625, 24.73625, 8.81875, 25.0925 ],

    #         }
        # initial_soil_moisture = 95

    model_path = "./aiModel/gradient_boosting_model.pkl"
    scaler_path = "./aiModel/scaler.pkl"


    # model_path = sys.argv[3]
    # scaler_path = sys.argv[4]


    # Predict soil moisture for the next 14 days
    model, scaler = load_model_and_scaler(model_path, scaler_path)
    predictions = predict_evapotranspiration(forecast_data, initial_soil_moisture, root_zone_depth, wilting_point, model, scaler)
    print(json.dumps(predictions))
    # print(predictions)

    # Print the predicted soil moisture for the next 14 days
