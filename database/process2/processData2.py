import json
from collections import defaultdict
from datetime import datetime

# Load soil moisture data from JSON file
with open("test.sensordatas.json", "r") as f:
    soil_moisture_data = json.load(f)

# Load weather data from JSON file
with open("test.weatherdatas.json", "r") as f:
    weather_data = json.load(f)

def min_value(data):
    if len(data) == 0:  # Check if data is empty
        return None  # Return None if data is empty
    return min(data)

# Group soil moisture data by date and calculate minimum soil moisture
min_soil_moisture = defaultdict(list)
for entry in soil_moisture_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    moisture_value = entry["moisture"]
    if 30 <= moisture_value <= 100:  # Filtering soil moisture values
        min_soil_moisture[date].append(moisture_value)

for date, moisture in min_soil_moisture.items():
    min_soil_moisture[date] = min_value(moisture)

# Group weather data by date and calculate minimum weather variables
min_weather_data = defaultdict(list)
for entry in weather_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    temperature = entry.get("temperature")
    humidity = entry.get("humidity")
    wind_speed = entry.get("wind_speed")
    if all(val is not None for val in [temperature, humidity, wind_speed]):  # Check for missing values
        min_weather_data[date].append((temperature, humidity, wind_speed))

for date, weather_vars in min_weather_data.items():
    temperatures, humidities, wind_speeds = zip(*weather_vars)
    min_weather_data[date] = (min_value(temperatures), min_value(humidities), min_value(wind_speeds))

# Merge weather data with soil moisture data
merged_data = {}
for date in set(min_soil_moisture.keys()) & set(min_weather_data.keys()):
    merged_data[date] = {
        "soil_moisture": min_soil_moisture[date],
        "temperature": min_weather_data[date][0],  # Extract minimum temperature
        "humidity": min_weather_data[date][1],     # Extract minimum humidity
        "wind_speed": min_weather_data[date][2]    # Extract minimum wind speed
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
    print(f"Date: {date}, Min Soil Moisture: {data['soil_moisture']}, Min Temperature: {data['temperature']}, Min Humidity: {data['humidity']}, Min Wind Speed: {data['wind_speed']}, Evapotranspiration: {evapotranspiration}")

# Save merged data to a JSON file
with open("merged_data_with_min_values.json", "w") as f:
    json.dump(merged_data, f)
