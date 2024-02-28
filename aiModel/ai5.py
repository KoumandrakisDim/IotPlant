# Import necessary libraries
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Load data
data = pd.read_csv("TARP.csv")

# Prepare training data
X_train = data[['Soil Moisture', 'Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']].values
y_train = data['Soil Moisture'].values

# Initialize Random Forest Regressor with correct number of features
rf_regressor = RandomForestRegressor()

# Train the model
rf_regressor.fit(X_train, y_train)

# Use the last available data point as the current soil moisture
current_soil_moisture = data['Soil Moisture'].iloc[-1]

# Make predictions for the next 7 days
forecast_data = {
    'Air temperature (C)': [25, 26, 27, 28, 29, 30, 31],  # Example forecasted temperature for the next 7 days
    'Wind speed (Km/h)': [5, 6, 7, 8, 9, 10, 11],         # Example forecasted wind speed for the next 7 days
    'Air humidity (%)': [60, 62, 65, 63, 61, 59, 58]       # Example forecasted humidity for the next 7 days
}

predictions = []
for day in range(7):
    # Predict soil moisture for the current day
    forecast = np.array([[current_soil_moisture, 
                          forecast_data['Air temperature (C)'][day], 
                          forecast_data['Wind speed (Km/h)'][day], 
                          forecast_data['Air humidity (%)'][day]]])
    prediction = rf_regressor.predict(forecast)[0]
    
    # Update the current soil moisture for the next day based on the difference between the predicted and current values
    decrease_rate = current_soil_moisture - prediction
    current_soil_moisture -= decrease_rate
    
    predictions.append(prediction)

print("Predicted soil moisture for the next 7 days:", predictions)
