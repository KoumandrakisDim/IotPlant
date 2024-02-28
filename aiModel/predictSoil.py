import sys
import json
from predict3 import predict_soil_moisture

# Parse arguments
forecast_data = json.loads(sys.argv[1])
initial_soil_moisture = float(sys.argv[2])
model_path = sys.argv[3]

# Call the prediction function
predictions = predict_soil_moisture(forecast_data, initial_soil_moisture, model_path)

# Print predictions as JSON
print(json.dumps(predictions))
