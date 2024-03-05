import json
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from collections import defaultdict
import pandas as pd
import joblib

# Load combined data
with open("combined_data.json", "r") as f:
    combined_data = json.load(f)

combined_data_df = pd.DataFrame.from_dict(combined_data, orient='index')

# Prepare the data
X = []  # Features (weather variables)
y = []  # Target (evapotranspiration)

for date, data in combined_data.items():
    if "evapotranspiration" in data:
        X.append([data["soil_moisture"], data["temperature"], data["humidity"], data["wind_speed"]])
        y.append(data["evapotranspiration"])

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the linear regression model
model = LinearRegression()
model.fit(X_train, y_train)

# Evaluate the model
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
print("Mean Squared Error:", mse)

# Example prediction
example_weather = [70, 20, 60, 2]  # Example weather variables for the next day
predicted_evapotranspiration = model.predict([example_weather])
print("Predicted Evapotranspiration:", predicted_evapotranspiration[0])
joblib.dump(model, 'super_ai2.pkl')
