import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import json

# Load the collected data from the JSON file
with open("cleaned_dataset.json", "r") as f:
    collected_data = json.load(f)

# Convert the collected data to a pandas DataFrame
collected_df = pd.DataFrame(collected_data)

def generate_synthetic_data(num_samples):
    # Generate synthetic temperature data within a realistic range
    synthetic_temperature = np.random.uniform(10, 40, num_samples)
    
    # Generate synthetic humidity data within a realistic range
    synthetic_humidity = np.random.uniform(40, 80, num_samples)
    
    # Generate synthetic wind speed data within a realistic range
    synthetic_wind_speed = np.random.uniform(0, 20, num_samples)
    
    # Calculate synthetic moisture values based on the combination of factors
    # You can define your own formula here based on the influence of temperature, humidity, and wind speed on moisture
    synthetic_moisture = (synthetic_temperature * 0.5 + synthetic_humidity * 0.3 + synthetic_wind_speed * 0.2) + np.random.normal(loc=0, scale=5, size=num_samples)
    
    # Clip moisture values to ensure they are within a valid range (0 to 100)
    synthetic_moisture = np.clip(synthetic_moisture, 0, 100)
    
    # Create a DataFrame to store the synthetic data
    synthetic_data = pd.DataFrame({
        'temperature': synthetic_temperature,
        'moisture': synthetic_moisture,
        'humidity': synthetic_humidity,
        'wind_speed': synthetic_wind_speed
    })
    
    return synthetic_data


# Generate synthetic data with 1000 samples based on the collected data
num_samples = 1000
synthetic_data = generate_synthetic_data(collected_df)

# Plot synthetic data
plt.figure(figsize=(8, 6))
plt.scatter(synthetic_data['temperature'], synthetic_data['moisture'], color='red', label='Synthetic Data')
plt.xlabel('Temperature')
plt.ylabel('Moisture')
plt.title('Synthetic Data')
plt.legend()
plt.grid(True)
plt.show()
