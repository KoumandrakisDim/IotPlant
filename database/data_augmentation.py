import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LinearRegression

with open("cleaned_dataset.json", "r") as f:
    soil_moisture_data = json.load(f)

collected_data = pd.DataFrame(soil_moisture_data)
collected_data.dropna(inplace=True)

# Fit a linear regression model to the collected data
X = collected_data[['temperature']]
y = collected_data['moisture']
model = LinearRegression()
model.fit(X, y)

# Generate synthetic data points based on the model
synthetic_temperatures = np.linspace(10, 40, 100)  # Example temperature range
synthetic_moisture = model.predict(synthetic_temperatures[:, np.newaxis])

# Create a DataFrame to store the synthetic data
synthetic_data = pd.DataFrame({
    'temperature': synthetic_temperatures,
    'moisture': synthetic_moisture
})

# Combine synthetic data with collected data
extended_data = pd.concat([collected_data, synthetic_data])

# Display the extended dataset
print(extended_data)

# Save extended dataset to a JSON file
extended_data.to_json('extended_dataset.json', orient='records')
import matplotlib.pyplot as plt

# Plot collected data
plt.figure(figsize=(8, 6))
plt.scatter(collected_data['temperature'], collected_data['moisture'], color='blue', label='Collected Data')
plt.xlabel('Temperature')
plt.ylabel('Moisture')
plt.title('Collected Data')
plt.legend()
plt.grid(True)
plt.show()

# Plot extended data
plt.figure(figsize=(8, 6))
plt.scatter(extended_data['temperature'], extended_data['moisture'], color='red', label='Extended Data')
plt.xlabel('Temperature')
plt.ylabel('Moisture')
plt.title('Extended Data')
plt.legend()
plt.grid(True)
plt.show()
