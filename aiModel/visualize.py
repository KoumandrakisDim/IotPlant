import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load combined data
with open("synthetic_data.json", "r") as f:
    combined_data = json.load(f)

# Convert to DataFrame
combined_data_df = pd.DataFrame.from_dict(combined_data, orient='index')

# Ensure correct data types
combined_data_df = combined_data_df.astype({
    'temperature': 'float',
    'humidity': 'float',
    'wind_speed': 'float',
    'solar_radiation': 'float',
    'min_temp': 'float',
    'max_temp': 'float',
    'evapotranspiration': 'float'
})

# Rename columns
combined_data_df = combined_data_df.rename(columns={
    'temperature': 'Temperature',
    'humidity': 'Humidity',
    'wind_speed': 'Wind Speed',
    'solar_radiation': 'Solar Radiation',
    'min_temp': 'Min Temp',
    'max_temp': 'Max Temp',
    'evapotranspiration': 'Evapotranspiration'
})

import seaborn as sns
import matplotlib.pyplot as plt

# Select relevant columns (ET and meteorological variables)
relevant_columns = ["Temperature", "Humidity", "Wind Speed", "Solar Radiation", "Min Temp", "Max Temp"]
relevant_data = combined_data_df[relevant_columns]

# Calculate correlation matrix
correlation_matrix = relevant_data.corr()

# Select only the first column (correlations with Evapotranspiration)
correlation_with_et = correlation_matrix.iloc[:, :1]

# Create a heatmap
plt.figure(figsize=(10, 4))  # Adjust the height of the plot as needed
sns.heatmap(correlation_with_et, annot=True, cmap='coolwarm', fmt=".2f", linewidths=0.5)
plt.title('Correlation of Evapotranspiration with Meteorological Variables')
plt.tight_layout()  # Adjust layout to prevent cutting off the bottom
plt.show()
