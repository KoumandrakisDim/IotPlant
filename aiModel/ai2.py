import json
from sklearn.model_selection import train_test_split
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error
import pandas as pd
import joblib
import numpy as np  # Import numpy

# Load combined data
with open("synthetic_data.json", "r") as f:
    combined_data = json.load(f)

combined_data_df = pd.DataFrame.from_dict(combined_data, orient='index')

# Prepare the data
X = []  # Features (weather variables)
y = []  # Target (evapotranspiration)

for date, data in combined_data.items():
    if "evapotranspiration" in data:
        X.append([data["soil_moisture"], data["temperature"], data["humidity"], data["wind_speed"]])
        y.append(data["evapotranspiration"])

# Convert data to numpy arrays
X = np.array(X)
y = np.array(y)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Feature Scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train the linear regression model with regularization (Ridge regression)
alpha_values = [0.1, 1, 10]  # Values to try for the regularization strength
best_mse = float('inf')
best_alpha = None

for alpha in alpha_values:
    model = Ridge(alpha=alpha)
    model.fit(X_train_scaled, y_train)
    y_pred = model.predict(X_test_scaled)
    mse = mean_squared_error(y_test, y_pred)
    
    if mse < best_mse:
        best_mse = mse
        best_alpha = alpha

# Retrain the model with the best alpha value
model = Ridge(alpha=best_alpha)
model.fit(X_train_scaled, y_train)

# Evaluate the model
y_pred = model.predict(X_test_scaled)
mse = mean_squared_error(y_test, y_pred)
print("Best Alpha:", best_alpha)
print("Mean Squared Error:", mse)

# Example prediction
example_weather = [[70, 20, 60, 2]]  # Example weather variables for the next day
example_weather_scaled = scaler.transform(example_weather)
predicted_evapotranspiration = model.predict(example_weather_scaled)
print("Predicted Evapotranspiration:", predicted_evapotranspiration[0])

# Save the model
joblib.dump(model, 'super_ai.pkl')
