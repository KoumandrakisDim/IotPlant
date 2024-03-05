import pandas as pd
import joblib

model_path = "super_ai.pkl"
model = joblib.load(model_path)

current_soil_moisture = 70  # Example value
weather_data_next_week = [
    {"temperature": 10, "humidity": 70, "wind_speed": 5},  # Day 1
    {"temperature": 12, "humidity": 65, "wind_speed": 6},  # Day 2
    {"temperature": 15, "humidity": 60, "wind_speed": 6},
    {"temperature": 17, "humidity": 55, "wind_speed": 6},
    {"temperature": 20, "humidity": 50, "wind_speed": 6},
    {"temperature": 8, "humidity": 45, "wind_speed": 6},
]

# Convert weather data to DataFrame
weather_df = pd.DataFrame(weather_data_next_week)

# Make predictions for each day of the next week
predictions = []
for index, weather_row in weather_df.iterrows():
    # Combine current soil moisture with weather data for each day
    input_features = [current_soil_moisture] + weather_row.tolist()
    print(input_features)
    # Predict evapotranspiration
    evapotranspiration_pred = model.predict([input_features])[0]
    
    # Update current soil moisture for the next day
    current_soil_moisture -= evapotranspiration_pred
    
    # Append prediction to the list
    predictions.append(evapotranspiration_pred)

# Print predictions for each day of the next week
for i, prediction in enumerate(predictions):
    print(f"Day {i+1}: Predicted Evapotranspiration = {prediction}")