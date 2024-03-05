import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load data
data = pd.read_csv("TARP.csv")

# Calculate the change in soil moisture for each day
data['Soil Moisture Change'] = data['Soil Moisture'].diff()

# Shift weather data by one day to align with soil moisture change
data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']] = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']].shift(1)

# Drop the first row since it will have NaN values after shifting
data.dropna(inplace=True)

# Prepare training data
X = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)', 'Soil Moisture']].values
y = data['Soil Moisture Change'].values

# Initialize Random Forest Regressor
rf_regressor = RandomForestRegressor()

# Train the model
rf_regressor.fit(X, y)

# Save the trained model
joblib.dump(rf_regressor, 'decrease_rate_model.pkl')

# Function to predict soil moisture for the next 14 days
def predict_soil_moisture(forecast_data, initial_soil_moisture, model_path):
    # Load trained model
    model = joblib.load(model_path)
    
    # Initialize list to store predicted soil moisture for the next 14 days
    predicted_moisture = []
    
    # Current soil moisture
    current_soil_moisture = initial_soil_moisture
    
    # Predict decrease rate for each day of the next week
    for _ in range(7):
        # Prepare input features for prediction
        forecast = np.array([[forecast_data['Air temperature (C)'][0], 
                              forecast_data['Wind speed (Km/h)'][0], 
                              forecast_data['Air humidity (%)'][0],
                              current_soil_moisture]])
        
        # Predict soil moisture change for the next day
        predicted_change = model.predict(forecast)[0]
        
        # Update current soil moisture for the next day
        current_soil_moisture -= predicted_change
        
        # Append the predicted moisture
        predicted_moisture.append(current_soil_moisture)
        
        # Update forecast data for the next day
        forecast_data = {key: forecast_data[key][1:] for key in forecast_data}
    
    return predicted_moisture

if __name__ == "__main__":
    # Example forecasted weather data for the next 7 days
    forecast_data = {
        'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],
        'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],
        'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]
    }
    
    # Initial soil moisture
    initial_soil_moisture = 90
    
    # Path to the trained model for predicting decrease rate
    model_path = "decrease_rate_model.pkl"
    
    # Predict soil moisture for the next 14 days
    predictions = predict_soil_moisture(forecast_data, initial_soil_moisture, model_path)
    
    # Print the predicted soil moisture for the next 14 days
    print("Predicted soil moisture for the next 14 days:", predictions)
