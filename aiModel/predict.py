import sys
import json
from sklearn.externals import joblib
import numpy as np

# Load the saved model
model_path = sys.argv[1]
model = joblib.load(model_path)

# Load data for prediction
new_data = json.loads(sys.argv[2])
new_data_values = np.array([list(new_data.values())])

# Make prediction
prediction = model.predict(new_data_values)
print(json.dumps(prediction.tolist()))
