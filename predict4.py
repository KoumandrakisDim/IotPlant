import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import json
import sys
import pandas as pd

def predict_soil_moisture(forecast_data, current_soil_moisture, model_path):
    predictions = []
    moisture_array = []
    weather_df = pd.DataFrame(forecast_data)
    model = joblib.load(model_path)

    # Assuming the model was trained on these features: humidity, temperature, wind_speed, and soil_moisture
    for index, weather_row in weather_df.iterrows():
        # Extract pop and rain variables
        pop = forecast_data['pop'][index]
        rain = forecast_data['rain'][index]

        # Combine current soil moisture with weather data and additional variables for each day
        input_features = [weather_row['Air humidity (%)'], weather_row['Air temperature (C)'], weather_row['Wind speed (Km/h)'], current_soil_moisture]

        # Predict evapotranspiration
        evapotranspiration_pred = model.predict([input_features])[0]
        
        # Adjust predicted moisture based on pop and rain
        predicted_moisture = current_soil_moisture - evapotranspiration_pred

        if(pop == 1 and rain > 10):
            predicted_moisture = 100
    

        # Update current soil moisture for the next day
        current_soil_moisture = predicted_moisture
        moisture_array.append(predicted_moisture)
        
        # Append prediction to the list
        predictions.append(evapotranspiration_pred)

    predictions_dict = {'predictedMoisture': moisture_array, 'predictedEvapotranspiration': predictions}
    return predictions_dict

if __name__ == "__main__":

    # forecast_data = {
    #     'Air temperature (C)': [ 19.8825, 21.09625, 23.82625, 24.73625, 25.81875, 25.0925 ],
    #     'Wind speed (Km/h)': [
    #         1.865,
    #         4.31625,
    #         4.648750000000001,
    #         4.235,
    #         2.8587500000000006,
    #         4.2425
    #     ],
    #     'Air humidity (%)': [ 47, 53.75, 50.125, 61.5, 80.5, 83.75 ],"pop":[1, 0.2, 1, 1, 1, 1],"rain":[12, 12, 15, 14, 13, 2]
    #         }
    
    # model_path = "super_ai3.pkl"

    forecast_data = json.loads(sys.argv[1])
    initial_soil_moisture = float(sys.argv[2])
    model_path = sys.argv[3]
    # extraParams = sys.argv[4]

    # initial_soil_moisture = 80

    # Predict soil moisture for the next 14 days
    predictionsArray = predict_soil_moisture(forecast_data, initial_soil_moisture, model_path)
    print(json.dumps(predictionsArray))

    # print(predictions)
    sys.stdout.flush()

    # Print the predicted soil moisture for the next 14 days
    # print("Predicted soil moisture for the next 14 days:", predictions)