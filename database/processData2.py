import json
from collections import defaultdict
from datetime import datetime
import numpy as np

# Load soil moisture data from JSON file
with open("test.sensordatas.json", "r") as f:
    soil_moisture_data = json.load(f)

# Load weather data from JSON file
with open("test.weatherdatas.json", "r") as f:
    weather_data = json.load(f)

def trimmed_mean(data, trim_percentage):
    if len(data) == 0:  # Check if data is empty
        return None  # Return None if data is empty
    trimmed_count = int(len(data) * trim_percentage / 100)
    sorted_data = sorted(data)
    trimmed_data = sorted_data[trimmed_count:-trimmed_count]
    mean_value = np.mean(trimmed_data)
    return mean_value if not np.isnan(mean_value) else None  # Check for NaN after calculating mean

# Group soil moisture data by date and calculate trimmed mean soil moisture
trimmed_mean_soil_moisture = defaultdict(list)
for entry in soil_moisture_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    moisture_value = entry["moisture"]
    if 30 <= moisture_value <= 100:  # Filtering soil moisture values
        trimmed_mean_soil_moisture[date].append(moisture_value)

for date, moisture in trimmed_mean_soil_moisture.items():
    trimmed_mean_soil_moisture[date] = trimmed_mean(moisture, 10)  # Example: Trim 10% from both ends

# Group weather data by date and calculate trimmed mean weather variables
trimmed_mean_weather_data = defaultdict(list)
for entry in weather_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    temperature = entry.get("temperature")
    humidity = entry.get("humidity")
    wind_speed = entry.get("wind_speed")
    if all(val is not None for val in [temperature, humidity, wind_speed]):  # Check for missing values
        trimmed_mean_weather_data[date].append((temperature, humidity, wind_speed))

# Merge weather data with soil moisture data
merged_data = {}
for date in set(trimmed_mean_soil_moisture.keys()) & set(trimmed_mean_weather_data.keys()):
    merged_data[date] = {
        "soil_moisture": trimmed_mean_soil_moisture[date],
        "temperature": trimmed_mean_weather_data[date][0][0],  # Extract temperature
        "humidity": trimmed_mean_weather_data[date][0][1],     # Extract humidity
        "wind_speed": trimmed_mean_weather_data[date][0][2]     # Extract wind speed
    }

# Calculate evapotranspiration (assuming sequential dates)
previous_date = None
for date in sorted(merged_data.keys()):
    current_soil_moisture = merged_data[date]["soil_moisture"]
    if previous_date is not None and previous_date in merged_data:
        previous_soil_moisture = merged_data[previous_date]["soil_moisture"]
        evapotranspiration = previous_soil_moisture - current_soil_moisture
        merged_data[date]["evapotranspiration"] = evapotranspiration if evapotranspiration >= 0 else None
    else:
        merged_data[date]["evapotranspiration"] = None
    previous_date = date

# Print merged data
for date, data in merged_data.items():
    evapotranspiration = data.get("evapotranspiration", "N/A")
    print(f"Date: {date}, Trimmed Mean Soil Moisture: {data['soil_moisture']}, Trimmed Mean Temperature: {data['temperature']}, Trimmed Mean Humidity: {data['humidity']}, Trimmed Mean Windspeed: {data['wind_speed']}, Evapotranspiration: {evapotranspiration}")

# Save merged data to a JSON file
with open("merged_data_with_trimmed_mean.json", "w") as f:
    json.dump(merged_data, f)
