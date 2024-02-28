import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

# Load the trained model
rf_regressor = joblib.load('super_ai.pkl')

# Prepare the data for prediction
prediction_data = pd.DataFrame({
    'Temperature': [60],             # Example temperature
    'Air humidity (%)': [50],        # Example air humidity
    'Wind speed (Km/h)': [2],        # Example wind speed
    'Soil Moisture': [0.6]           # Example soil moisture value
})

# Make prediction for the provided data
prediction = rf_regressor.predict(prediction_data)
print("Predicted Soil Moisture:", prediction)
