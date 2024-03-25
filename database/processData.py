import json
from collections import defaultdict
from datetime import datetime
import statistics

# Load soil moisture data from JSON file
with open("test.sensordatas.json", "r") as f:
    soil_moisture_data = json.load(f)

# Load weather data from JSON file
with open("test.weatherdatas.json", "r") as f:
    weather_data = json.load(f)

# Group soil moisture data by date and calculate median soil moisture
median_soil_moisture = defaultdict(list)
for entry in soil_moisture_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    moisture_value = entry["moisture"]
    if 30 <= moisture_value <= 100:  # Filtering soil moisture values
        median_soil_moisture[date].append(moisture_value)

for date, moisture in median_soil_moisture.items():
    median_soil_moisture[date] = statistics.median(moisture)

# Group weather data by date and calculate median weather variables
median_weather_data = defaultdict(list)
for entry in weather_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    median_weather_data[date].append((entry["temperature"], entry["humidity"], entry.get("wind_speed", None)))

# Calculate median temperature, humidity, and wind speed for each date
for date, data in median_weather_data.items():
    temperatures = [temp for temp, _, _ in data]
    humidities = [humidity for _, humidity, _ in data]
    wind_speeds = [wind_speed for _, _, wind_speed in data if wind_speed is not None]
    temperature_median = statistics.median(temperatures)
    humidity_median = statistics.median(humidities)
    wind_speed_median = statistics.median(wind_speeds) if wind_speeds else None
    median_weather_data[date] = {"temperature": temperature_median, "humidity": humidity_median, "wind_speed": wind_speed_median}

# Merge weather data with soil moisture data
merged_data = {}
for date in set(median_soil_moisture.keys()) & set(median_weather_data.keys()):
    merged_data[date] = {
        "soil_moisture": median_soil_moisture[date],
        "temperature": median_weather_data[date]["temperature"],
        "humidity": median_weather_data[date]["humidity"],
        "wind_speed": median_weather_data[date]["wind_speed"]
    }

# Calculate evapotranspiration
previous_date = None
for date in sorted(merged_data.keys()):
    current_soil_moisture = merged_data[date]["soil_moisture"]
    if previous_date is not None and previous_date in merged_data:
        previous_soil_moisture = merged_data[previous_date]["soil_moisture"]
        print(previous_soil_moisture)

        evapotranspiration = previous_soil_moisture - current_soil_moisture
        print(evapotranspiration)

        merged_data[date]["evapotranspiration"] = evapotranspiration if evapotranspiration >= 0 else None
    else:
        merged_data[date]["evapotranspiration"] = None
    previous_date = date

# Print merged data
for date, data in merged_data.items():
    evapotranspiration = data.get("evapotranspiration", "N/A")
    # print(f"Date: {date}, Median Soil Moisture: {data['soil_moisture']}, Median Temperature: {data['temperature']}, Median Humidity: {data['humidity']}, Median Windspeed: {data['wind_speed']}, Evapotranspiration: {evapotranspiration}")

# Save merged data to a JSON file
with open("merged_data_with_evapotranspiration.json", "w") as f:
    json.dump(merged_data, f)
