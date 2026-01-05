import sys
from cropModel import predict_disease

image_path = sys.argv[1]
result = predict_disease(image_path)
print(result)
