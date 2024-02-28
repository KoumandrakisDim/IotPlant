import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split
import joblib

# Load the dataset
data = pd.read_csv('TARP.csv')

# Drop rows with missing values
data.dropna(inplace=True)

# Separate features and target variable
X = data[['Temperature', 'Air humidity (%)', 'Wind speed (Km/h)', 'Soil Moisture']]  # Include current soil moisture value
y = data['Soil Moisture']

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize the Random Forest regressor with hyperparameters
rf_regressor = RandomForestRegressor(n_estimators=100, random_state=42)

# Train the Random Forest regressor
rf_regressor.fit(X_train, y_train)

# Make predictions on the testing set
predictions = rf_regressor.predict(X_test)

# Evaluate the model using Mean Squared Error (MSE)
mse = mean_squared_error(y_test, predictions)
print("Mean Squared Error:", mse)

# Print the predicted values
print("Predicted values:", predictions)

# Save the trained model to a file
joblib.dump(rf_regressor, 'random_forest_model.pkl')
