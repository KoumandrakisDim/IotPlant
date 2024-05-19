import pandas as pd

# Load the dataset
df = pd.read_json('test.sensordatas.json')  # Replace 'test.sensordatas.json' with the path to your JSON dataset file

# Convert string columns to float
df['moisture'] = df['moisture'].astype(float)  # Convert 'moisture' column to float if it contains strings
df['humidity'] = df['humidity'].astype(float) 
df['temperature'] = df['temperature'].astype(float) 
df['moisture'] = df['moisture'].astype(float) 

# Filter out rows with "moisture" values outside the range of 0 to 100
cleaned_df = df[(df['moisture'] >= 0) & (df['moisture'] <= 100)]

# Save the cleaned dataset to a new JSON file
cleaned_df.to_json('cleaned_dataset.json', orient='records')
