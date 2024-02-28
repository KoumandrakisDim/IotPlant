import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load the trained model
rf_regressor = joblib.load('random_forest_model.pkl')

# Assume you have the current soil moisture and weather data for the next 7 days
# Replace the following with your actual data
current_soil_moisture = 0.2  # Replace with your current soil moisture value
forecast_data = [
    {'Temperature': 25, 'Air humidity (%)': 60, 'Wind speed (Km/h)': 10},  # Day 1
    {'Temperature': 26, 'Air humidity (%)': 55, 'Wind speed (Km/h)': 12},  # Day 2
    {'Temperature': 27, 'Air humidity (%)': 50, 'Wind speed (Km/h)': 15},  # Day 3
    {'Temperature': 28, 'Air humidity (%)': 48, 'Wind speed (Km/h)': 17},  # Day 4
    {'Temperature': 29, 'Air humidity (%)': 45, 'Wind speed (Km/h)': 20},  # Day 5
    {'Temperature': 30, 'Air humidity (%)': 42, 'Wind speed (Km/h)': 22},  # Day 6
    {'Temperature': 31, 'Air humidity (%)': 40, 'Wind speed (Km/h)': 25}   # Day 7
]

# Initialize a list to store predicted soil moisture values
predicted_soil_moisture = []

# Predict soil moisture for each day
for day_data in forecast_data:
    # Add the current soil moisture value to the current day's features
    day_data['Soil Moisture'] = current_soil_moisture
    print(current_soil_moisture)

    # Convert day's data into DataFrame
    day_df = pd.DataFrame([day_data])
    print("Input data for prediction:")
    print(day_df)  # Debug print
    # Make prediction for the current day
    predicted_moisture = rf_regressor.predict(day_df)
    print("Predicted moisture:", predicted_moisture)  # Debug print
    # Append the predicted soil moisture to the list
    predicted_soil_moisture.append(predicted_moisture[0])
    # Update current soil moisture for the next day
    current_soil_moisture = predicted_moisture[0]

# Print the predicted soil moisture values for the next 7 days
print("Predicted soil moisture for the next 7 days:")
for day, moisture in enumerate(predicted_soil_moisture, start=1):
    print(f"Day {day}: {moisture}")
