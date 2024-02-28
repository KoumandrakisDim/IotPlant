# Import necessary libraries
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load data
data = pd.read_csv("TARP.csv")

# Calculate the soil moisture for the next day
data['Next Day Soil Moisture'] = data['Soil Moisture'].shift(-1)

# Drop the last row (since we don't have future data for it)
data.dropna(inplace=True)

# Prepare training data
X_train = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)', 'Soil Moisture']].values
y_train = data['Next Day Soil Moisture'].values

# Initialize Random Forest Regressor with correct number of features
rf_regressor = RandomForestRegressor()

# Train the model
rf_regressor.fit(X_train, y_train)

# Make predictions for the next 7 days
forecast_data = {
    'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],  # Example forecasted temperature for the next 7 days
    'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],         # Example forecasted wind speed for the next 7 days
    'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]  # Assuming initial soil moisture is the same for all 7 days
}

current_soil_moisture = 50

# Predict soil moisture for the first 7 days and calculate average decrease rate
predicted_moisture = []
for day in range(7):
    # Predict soil moisture for the next day
    forecast = np.array([[forecast_data['Air temperature (C)'][day], 
                          forecast_data['Wind speed (Km/h)'][day], 
                          forecast_data['Air humidity (%)'][day],
                          current_soil_moisture]])
                          
    next_day_soil_moisture = rf_regressor.predict(forecast)[0]
    
    # Update the current soil moisture for the next day
    current_soil_moisture -= (current_soil_moisture - next_day_soil_moisture) * 0.02  # Adjust the decrease rate as needed
    
    predicted_moisture.append(current_soil_moisture)

# Calculate the average decrease rate for the first week
average_decrease_rate = (data['Soil Moisture'].iloc[-1] - predicted_moisture[-1]) / data.shape[0]

# Extend the prediction for the next 7 days using the average decrease rate
extended_predictions = []
for _ in range(7):
    current_soil_moisture -= average_decrease_rate * current_soil_moisture
    extended_predictions.append(current_soil_moisture)

print("Predicted soil moisture for the next 14 days:", predicted_moisture + extended_predictions)
joblib.dump(rf_regressor, 'super_ai.pkl')
