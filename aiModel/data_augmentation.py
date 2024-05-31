import random
from datetime import datetime, timedelta
import json
import math

# Original data (partial example provided)
data = {
    "2024-03-10": {
        "soil_moisture": 95.0,
        "temperature": 22.0,
        "humidity": 80,
        "wind_speed": 1.5,
        "evapotranspiration": 3.5
    },
    "2024-03-11": {
        "soil_moisture": 92.0,
        "temperature": 24.0,
        "humidity": 78,
        "wind_speed": 1.7,
        "evapotranspiration": 3.8
    },
    "2024-03-12": {
        "soil_moisture": 88.5,
        "temperature": 25.5,
        "humidity": 75,
        "wind_speed": 1.9,
        "evapotranspiration": 4.2
    },
    "2024-03-13": {
        "soil_moisture": 85.0,
        "temperature": 26.5,
        "humidity": 72,
        "wind_speed": 2.1,
        "evapotranspiration": 4.0
    },
    "2024-03-14": {
        "soil_moisture": 82.0,
        "temperature": 28.0,
        "humidity": 70,
        "wind_speed": 2.3,
        "evapotranspiration": 3.8
    },
    "2024-03-15": {
        "soil_moisture": 78.5,
        "temperature": 29.5,
        "humidity": 68,
        "wind_speed": 2.5,
        "evapotranspiration": 3.6
    },
    "2024-03-16": {
        "soil_moisture": 75.0,
        "temperature": 30.0,
        "humidity": 65,
        "wind_speed": 2.7,
        "evapotranspiration": 3.4
    },
    "2024-03-17": {
        "soil_moisture": 71.5,
        "temperature": 31.0,
        "humidity": 62,
        "wind_speed": 2.9,
        "evapotranspiration": 3.2
    },
    "2024-03-18": {
        "soil_moisture": 68.0,
        "temperature": 17.0,
        "humidity": 60,
        "wind_speed": 3.1,
        "evapotranspiration": 3.0
    },
    "2024-03-19": {
        "soil_moisture": 64.5,
        "temperature": 16.0,
        "humidity": 58,
        "wind_speed": 3.3,
        "evapotranspiration": 2.8
    },
    "2024-03-20": {
        "soil_moisture": 60.0,
        "temperature": 15.0,
        "humidity": 90,
        "wind_speed": 12.0,
        "evapotranspiration": 1.2
    }
}

# Function to calculate evapotranspiration based on environmental factors
def calculate_evapotranspiration(temperature, humidity, wind_speed_kmh, solar_radiation, min_temp, max_temp, soil_moisture):
    # Convert wind speed from km/h to m/s
    wind_speed_m_s = wind_speed_kmh / 3.6
    
    # Constants
    pressure = 101.3  # kPa (standard atmospheric pressure at sea level)
    psychro_const = 0.665 * 10**-3 * pressure  # psychrometric constant, kPa/°C
    G = 0  # Soil heat flux density (assumed to be zero for daily calculations)
    
    # Saturation vapor pressure (e_s)
    sat_vap_pressure = 0.6108 * math.exp((17.27 * temperature) / (temperature + 237.3))

    # Actual vapor pressure (e_a)
    act_vap_pressure = sat_vap_pressure * (humidity / 100.0)

    # Slope of the vapor pressure curve (Δ)
    slope_vap_curve = (4098 * sat_vap_pressure) / ((temperature + 237.3) ** 2)
    
    # Net radiation (R_n)
    # Calculate net shortwave radiation
    alpha = 0.23  # Albedo coefficient
    R_ns = (1 - alpha) * solar_radiation  # in MJ/m²/day
    
    # Calculate net outgoing longwave radiation
    T_k_min = min_temp + 273.16  # Convert to Kelvin
    T_k_max = max_temp + 273.16  # Convert to Kelvin
    e_a = act_vap_pressure

    # Correct longwave radiation calculation
    R_nl = 4.903e-9 * (((T_k_max ** 4 + T_k_min ** 4) / 2) * (0.34 - 0.14 * math.sqrt(e_a)) * (1.35 * R_ns / R_ns - 0.35))
    
    # Ensure R_nl is not greater than R_ns
    if R_nl > R_ns:
        R_nl = R_ns * 0.75

    # Net radiation
    net_radiation = R_ns - R_nl
    
    # Reference evapotranspiration (ET_0)
    ET_0 = (
        (0.408 * slope_vap_curve * (net_radiation - G)) +
        (psychro_const * (900 / (temperature + 273)) * wind_speed_m_s * (sat_vap_pressure - act_vap_pressure))
    ) / (
        slope_vap_curve + psychro_const * (1 + 0.34 * wind_speed_m_s)
    )
    
    # Soil moisture factor (K_s)
    field_capacity = 90  # example value, you can adjust based on actual field capacity
    wilting_point = 40    # example value, you can adjust based on actual wilting point
    
    if soil_moisture > field_capacity:
        K_s = 1
    elif soil_moisture < wilting_point:
        K_s = 0
    else:
        K_s = ((soil_moisture - wilting_point) / (field_capacity - wilting_point)) ** 0.5  # Using an exponent to increase sensitivity
    
    # Actual evapotranspiration (ET_actual)
    ET_actual = ET_0 * K_s
    
    return max(ET_actual, 0)  # Ensuring no negative values


# Generate the dataset
def generate_dataset(start_date, num_days, cycle_length=10):
    dataset = {}
    start_date = datetime.strptime(start_date, "%Y-%m-%d")
    
    # Initial data
    last_entry = data["2024-03-20"]
    soil_moisture = last_entry["soil_moisture"]
    
    # Initial weather conditions
    temperature = last_entry["temperature"]
    humidity = last_entry["humidity"]
    wind_speed = last_entry["wind_speed"]
    solar_radiation = 20  # Starting average value for solar radiation
    min_temp = temperature - 10  # Example starting value
    max_temp = temperature + 10  # Example starting value

    for day in range(num_days):
        current_date = start_date + timedelta(days=day)
        current_date_str = current_date.strftime("%Y-%m-%d")
        
        if day % cycle_length == 0:
            # Reset soil moisture to a high value every cycle_length days
            soil_moisture = 90.0
        
        # Generate weather with some continuity
        temperature = max(min(temperature + random.uniform(-2, 2), 35), -5)  # Example range with continuity
        humidity = max(min(humidity + random.uniform(-5, 5), 100), 0)  # Example range with continuity
        wind_speed = max(min(wind_speed + random.uniform(-0.5, 0.5), 10), 0)  # Example range with continuity
        solar_radiation = max(min(solar_radiation + random.uniform(-2, 2), 30), 5)  # Example range with continuity
        min_temp = max(min(min_temp + random.uniform(-2, 2), max_temp), -10)  # Ensuring min_temp <= max_temp
        max_temp = max(min(max_temp + random.uniform(-2, 2), 40), min_temp)  # Ensuring max_temp >= min_temp

        # Calculate evapotranspiration based on the environmental variables
        evapotranspiration = calculate_evapotranspiration(temperature, humidity, wind_speed, solar_radiation, min_temp, max_temp, soil_moisture)
        
        # Update soil moisture
        soil_moisture = max(soil_moisture - evapotranspiration, 0)
        
        # Add to dataset
        dataset[current_date_str] = {
            "soil_moisture": round(soil_moisture, 1),
            "temperature": round(temperature, 1),
            "humidity": round(humidity),
            "wind_speed": round(wind_speed, 1),
            "solar_radiation": round(solar_radiation, 1),
            "min_temp": round(min_temp, 1),
            "max_temp": round(max_temp, 1),
            "evapotranspiration": round(evapotranspiration, 1)
        }
    
    return dataset

# Usage
start_date = "2024-03-21"  # The day after the last date in the original data
num_days = 365 * 5  # Generate data for one year
new_data = generate_dataset(start_date, num_days)

# Print some of the generated data
for date, values in list(new_data.items())[:10]:  # Print first 10 days
    print(date, values)

with open("synthetic_data.json", "w") as f:
    json.dump(new_data, f, indent=4)
