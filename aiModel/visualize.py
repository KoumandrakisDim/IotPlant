import seaborn as sns
import matplotlib.pyplot as plt

import pandas as pd

# Read the data
data = pd.read_csv("TARP.csv")  # Replace "your_data_file.csv" with your actual data file path
data = data.drop(columns=['Status'])

# Calculate the correlation matrix
correlation_matrix = data.corr()


import seaborn as sns
import matplotlib.pyplot as plt

# Plotting the heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm', fmt=".2f")
plt.title('Correlation Matrix')
plt.show()
