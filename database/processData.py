import json
from collections import defaultdict
from datetime import datetime

# Load soil moisture data from JSON file
with open("smartPlant.sensordatas.json", "r") as f:
    soil_moisture_data = json.load(f)

# Load weather data from JSON file
with open("smartPlant.weatherdatas.json", "r") as f:
    weather_data = json.load(f)

# Group soil moisture data by date and calculate average soil moisture
average_soil_moisture = defaultdict(list)
for entry in soil_moisture_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    average_soil_moisture[date].append(entry["value"])

for date, values in average_soil_moisture.items():
    average_soil_moisture[date] = sum(values) / len(values)

# Group weather data by date and calculate averages
weather_by_date = defaultdict(list)
for entry in weather_data:
    date = entry["timestamp"]["$date"].split("T")[0]
    weather_by_date[date].append((entry["temperature"], entry["humidity"], entry.get("wind_speed", None)))
    

# Calculate average temperature, humidity, and wind speed for each date
average_weather_data = {}
for date, data in weather_by_date.items():
    temperatures = [temp for temp, _, _ in data]
    humidities = [humidity for _, humidity, _ in data]
    wind_speeds = [wind_speed for _, _, wind_speed in data if wind_speed is not None]
    temperature_avg = sum(temperatures) / len(temperatures)
    humidity_avg = sum(humidities) / len(humidities)
    wind_speed_avg = sum(wind_speeds) / len(wind_speeds) if wind_speeds else None
    average_weather_data[date] = {"temperature": temperature_avg, "humidity": humidity_avg, "wind_speed": wind_speed_avg}
    # print(average_weather_data[date])

# Combine average soil moisture data with average weather data and calculate evapotranspiration
combined_data = {}
for date, soil_moisture in average_soil_moisture.items():
    if date in average_weather_data:
        combined_data[date] = {
            "soil_moisture": soil_moisture,
            "temperature": average_weather_data[date]["temperature"],
            "humidity": average_weather_data[date]["humidity"],
            "wind_speed": average_weather_data[date]["wind_speed"]
        }

# Calculate evapotranspiration for each day
previous_soil_moisture = None
for date, data in sorted(combined_data.items()):
    current_soil_moisture = data["soil_moisture"]
    if previous_soil_moisture is not None:
        evapotranspiration = previous_soil_moisture - current_soil_moisture
        if evapotranspiration < 0:
            del combined_data[date]  # Remove the day if evapotranspiration is negative
        else:
            combined_data[date]["evapotranspiration"] = evapotranspiration
    previous_soil_moisture = current_soil_moisture

# Print combined data
for date, data in combined_data.items():
    print(f"Date: {date}, Soil Moisture: {data['soil_moisture']}, Temperature: {data['temperature']}, Humidity: {data['humidity']}, Windspeed: {data['wind_speed']}, Evapotranspiration: {data.get('evapotranspiration', 'N/A')}")

with open("combined_data.json", "w") as f:
    json.dump(combined_data, f)