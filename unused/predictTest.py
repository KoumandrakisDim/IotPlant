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

        # Predict evapotranspiration
        evapotranspiration_pred = model.predict([input_features])[0]
        
        # Update current soil moisture for the next day
        current_soil_moisture -= evapotranspiration_pred
        moistureArray.append(current_soil_moisture)
        # Append prediction to the list
        predictions.append(evapotranspiration_pred)
    print(predictions)

    return moistureArray

if __name__ == "__main__":

    forecast_data = {
  'Air temperature (C)': [
    52.28,
    -1.0225,
    -1.4075000000000002,
    -0.8587499999999999,
    0.175,
    -50.984
  ],
  'Wind speed (Km/h)': [
    3.36,
    1.9200000000000002,
    1.3875,
    1.485,
    1.9824999999999997,
    2.978
  ],
  'Air humidity (%)': [ 83.33333333333333, 89.5, 91.25, 90.625, 88.5, 82 ]
}
    initial_soil_moisture = 80
    
    model_path = "super_ai2.pkl"

    # Predict soil moisture for the next 14 days
    predictions = predict_soil_moisture(forecast_data, initial_soil_moisture, model_path)
    print(json.dumps(predictions))

    # print(predictions)
    sys.stdout.flush()

    # Print the predicted soil moisture for the next 14 days
    # print("Predicted soil moisture for the next 14 days:", predictions)