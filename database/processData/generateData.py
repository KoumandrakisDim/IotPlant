import numpy as np
import pandas as pd
import json

def generate_daily_data(previous_day_data):
    # Extract previous day's data
    previous_moisture = previous_day_data['soil_moisture']
    previous_temperature = previous_day_data['temperature']
    previous_humidity = previous_day_data['humidity']
    previous_wind_speed = previous_day_data['wind_speed']
    
    # Define environmental parameters range and weights
    temperature_weight = 0.3
    humidity_weight = 0.2
    wind_speed_weight = 0.1
    
    # Generate random values for environmental parameters within a realistic range
    temperature = np.random.uniform(10, 30)  # Celsius
    humidity = np.random.uniform(40, 80)  # Percentage
    wind_speed = np.random.uniform(0, 10)  # km/h
    
    # Calculate change in moisture based on environmental parameters
    delta_temperature = previous_temperature - temperature
    delta_humidity = previous_humidity - humidity
    delta_wind_speed = wind_speed - previous_wind_speed
    
    # Calculate evapotranspiration based on the change in environmental parameters
    evapotranspiration = (delta_temperature * temperature_weight +
                          delta_humidity * humidity_weight +
                          delta_wind_speed * wind_speed_weight)
    
    # Ensure evapotranspiration is positive (moisture loss)
    evapotranspiration = max(evapotranspiration, 0)
    
    # Calculate current day's soil moisture based on previous day's moisture and evapotranspiration
    current_moisture = previous_moisture - evapotranspiration
    
    # Clip moisture to ensure it stays within valid range (0 to 100)
    current_moisture = np.clip(current_moisture, 0, 100)
    
    # Create dictionary for current day's data
    daily_data = {
        "soil_moisture": current_moisture,
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "evapotranspiration": evapotranspiration
    }
    
    return daily_data

def generate_data(start_date, end_date):
    # Initialize data storage
    data = {}
    
    # Initialize previous day's data with arbitrary values for the first day
    previous_day_data = {
        "soil_moisture": np.random.uniform(50, 70),
        "temperature": np.random.uniform(15, 25),
        "humidity": np.random.uniform(50, 70),
        "wind_speed": np.random.uniform(0, 5),
        "evapotranspiration": 0
    }
    
    # Generate data for each day
    current_date = start_date
    while current_date <= end_date:
        # Generate data for current day
        current_day_data = generate_daily_data(previous_day_data)
        
        # Store current day's data
        data[current_date.strftime('%Y-%m-%d')] = current_day_data
        
        # Update previous day's data for the next iteration
        previous_day_data = current_day_data
        
        # Move to the next day
        current_date += pd.Timedelta(days=1)
    
    return data

# Generate synthetic data for a period of 30 days (for example)
start_date = pd.to_datetime('2024-03-01')
end_date = start_date + pd.Timedelta(days=29)
synthetic_data = generate_data(start_date, end_date)

# Save generated data to a JSON file
with open('synthetic_data.json', 'w') as file:
    json.dump(synthetic_data, file, indent=4)
