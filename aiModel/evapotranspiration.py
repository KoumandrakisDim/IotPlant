import pandas as pd

# Read the data
data = pd.read_csv("TARP.csv")  # Replace "your_data_file.csv" with your actual data file path

# Calculate evapotranspiration
data['Evapotranspiration'] = data['Soil Moisture'].diff() - data['Soil Moisture'].diff().clip(upper=0).abs()

# Fill NaN values in the first row with 0
data['Evapotranspiration'].iloc[0] = 0

# Print the updated dataset
print(data)
