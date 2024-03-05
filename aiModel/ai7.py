import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer

# Load data
data = pd.read_csv("TARP.csv")
data.dropna(inplace=True)

# Prepare training data
X = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']].values
y = data['Soil Moisture'].values  # Predicting the actual soil moisture, not just the change

# Handling missing values
imputer = SimpleImputer(strategy='mean')
X_imputed = imputer.fit_transform(X)

# Initialize Gradient Boosting Regressor
gb_regressor = GradientBoostingRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)

# Predict soil moisture for the next 14 days
predicted_moisture = []
current_weather_data = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']].iloc[-7:].mean().values.reshape(1, -1)
current_soil_moisture = data['Soil Moisture'].iloc[-1]  # Initial soil moisture

for day in range(14):
    # Train the model with updated weather data
    gb_regressor.fit(X_imputed, y)
    
    # Predict soil moisture for the next day using current weather data
    next_day_moisture = gb_regressor.predict(current_weather_data)[0]
    
    # Append the predicted moisture
    predicted_moisture.append(next_day_moisture)
    
    # Update current soil moisture for the next day
    current_soil_moisture = next_day_moisture
    
    # Update weather data for the next day
    current_weather_data = data[['Air temperature (C)', 'Wind speed (Km/h)', 'Air humidity (%)']].shift(-1).iloc[-7:].mean().values.reshape(1, -1)
    data.dropna(inplace=True)

# Print the predicted soil moisture for the next 14 days
print("Predicted soil moisture for the next 14 days:", predicted_moisture)
