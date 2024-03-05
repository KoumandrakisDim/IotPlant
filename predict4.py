import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import json
import sys
import pandas as pd

def predict_soil_moisture(forecast_data, current_soil_moisture, model_path):
    predictions = []
    weather_df = pd.DataFrame(forecast_data)
    model = joblib.load(model_path)
    moistureArray = []

    for index, weather_row in weather_df.iterrows():
        # Combine current soil moisture with weather data for each day
        input_features = [current_soil_moisture] + weather_row.tolist()
        print(input_features)
        # Predict evapotranspiration
        evapotranspiration_pred = model.predict([input_features])[0]
        
        # Update current soil moisture for the next day
        current_soil_moisture -= evapotranspiration_pred
        moistureArray.append(current_soil_moisture)
        # Append prediction to the list
        predictions.append(evapotranspiration_pred)

    
    return moistureArray

if __name__ == "__main__":

    forecast_data = {
        'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],
        'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],
        'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]
    }
    initial_soil_moisture = 90
    
    model_path = "super_ai2.pkl"

    # forecast_data = json.loads(sys.argv[1])
    # initial_soil_moisture = float(sys.argv[2])
    # model_path = sys.argv[3]
    
    # Predict soil moisture for the next 14 days
    predictions = predict_soil_moisture(forecast_data, initial_soil_moisture, model_path)
    print(json.dumps(predictions))

    # print(predictions)
    sys.stdout.flush()

    # Print the predicted soil moisture for the next 14 days
    # print("Predicted soil moisture for the next 14 days:", predictions)