import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib
import json
import sys

def predict_soil_moisture(forecast_data, initial_soil_moisture, model_path):
    # Load trained model
    model = joblib.load(model_path)
    
    # Predict soil moisture for the next 7 days
    predicted_moisture = []
    current_soil_moisture = initial_soil_moisture  # Initial soil moisture
    
    for day in range(6):
        # Prepare input features for prediction
        forecast = np.array([[forecast_data['Air temperature (C)'][day], 
                              forecast_data['Wind speed (Km/h)'][day], 
                              forecast_data['Air humidity (%)'][day],
                              current_soil_moisture]])
        
        # Predict soil moisture for the next day
        next_day_soil_moisture = model.predict(forecast)[0]

        current_soil_moisture -= (current_soil_moisture - next_day_soil_moisture) * 0.02
        
        # Update current soil moisture
        
        predicted_moisture.append(current_soil_moisture)
    
    # Calculate decrease rate for the first week based on the forecasted values
    decrease_rate = (initial_soil_moisture - predicted_moisture[-1]) / initial_soil_moisture
    print(decrease_rate)
    
    # Extend the prediction for the next 7 days using the calculated decrease rate
    extended_predictions = []
    for _ in range(7):
        current_soil_moisture -= decrease_rate
        extended_predictions.append(current_soil_moisture)
    
    # Combine predictions for the next 14 days
    predictions = predicted_moisture + extended_predictions
    
    return predictions

if __name__ == "__main__":

    forecast_data = {
        'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],
        'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],
        'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]
    }
    initial_soil_moisture = 90
    
    model_path = "super_ai.pkl"

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