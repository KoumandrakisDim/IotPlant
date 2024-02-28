import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import joblib

# Load the dataset
data = pd.read_csv('TARP.csv')

# Keep only the selected columns
selected_columns = ['Soil Moisture', 'Temperature', 'Air humidity (%)', 'Wind speed (Km/h)']
data = data[selected_columns]

# Drop rows with missing values
data.dropna(inplace=True)

# Separate features and target variable
X = data.drop(columns=['Soil Moisture'])
y = data['Soil Moisture']

# Split the dataset into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Standardize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Initialize the decision tree classifier with hyperparameters
clf = DecisionTreeClassifier(max_depth=5, min_samples_split=5, random_state=42)

# Train the classifier
clf.fit(X_train_scaled, y_train)

# Make predictions on the testing set
predictions = clf.predict(X_test_scaled)

# Evaluate the model
accuracy = accuracy_score(y_test, predictions)
print("Decision Tree Classifier Accuracy:", accuracy)

# Initialize the Random Forest classifier with hyperparameters
rf_clf = RandomForestClassifier(n_estimators=100, random_state=42)

# Train the Random Forest classifier
rf_clf.fit(X_train_scaled, y_train)

# Make predictions on the testing set using Random Forest
rf_predictions = rf_clf.predict(X_test_scaled)

# Evaluate the Random Forest model
rf_accuracy = accuracy_score(y_test, rf_predictions)
print("Random Forest Classifier Accuracy:", rf_accuracy)

# Now, you can use this trained model to make predictions on new data
# For example:
new_data = pd.DataFrame({
    'Temperature': [30],
    'Air humidity (%)': [50],
    'Wind speed (Km/h)': [2]
})

# Standardize new data using the same scaler
new_data_scaled = scaler.transform(new_data)

# Predict Soil Moisture using Random Forest
rf_prediction = rf_clf.predict(new_data_scaled)
print("Predicted Soil Moisture using Random Forest:", rf_prediction)


# Save the trained model
joblib.dump(rf_clf, 'random_forest_model.pkl')
