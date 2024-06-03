import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
import joblib
from sklearn.preprocessing import StandardScaler

# Load combined data
with open("synthetic_data.json", "r") as f:
    combined_data = json.load(f)

combined_data_df = pd.DataFrame.from_dict(combined_data, orient='index')

# Prepare the data
X = combined_data_df[['soil_moisture', 'temperature', 'humidity', 'wind_speed', 'solar_radiation', 'min_temp', 'max_temp']].values
y = combined_data_df['evapotranspiration'].values

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Feature Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Gradient Boosting Regressor
gb_reg = GradientBoostingRegressor()
gb_reg.fit(X_train_scaled, y_train)

# Evaluate the model
y_pred = gb_reg.predict(X_test_scaled)
mse = mean_squared_error(y_test, y_pred)
print("Mean Squared Error (Test Set):", mse)

# Save the model
joblib.dump(gb_reg, 'gradient_boosting_model.pkl')

# Example prediction
example_weather = [[87.7, 16.6, 92, 10, 20, 3.1, 25.7]]  # Example weather variables for the next day
example_weather_scaled = scaler.transform(example_weather)
predicted_evapotranspiration = gb_reg.predict(example_weather_scaled)
print("Predicted Evapotranspiration:", predicted_evapotranspiration[0])
