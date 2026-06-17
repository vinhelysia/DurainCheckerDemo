import pandas as pd
import numpy as np
import json
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# 1. Load dataset
df = pd.read_csv("ml/disease_dataset.csv")

# 2. Schema mapping definitions
soil_drainage_mapping = {
    "good": 0.0,
    "medium": 1.0,
    "poor": 2.0
}
label_mapping = {
    0: "healthy",
    1: "phytophthora",
    2: "anthracnose",
    3: "leaf_blight"
}
feature_order = [
    "temperature_c",
    "humidity_pct",
    "rainfall_mm",
    "leaf_wetness_hours",
    "soil_drainage",
    "harvest_month",
    "tree_age_years",
    "prior_infection"
]

# Preprocess features
X = df[feature_order].copy()
X["soil_drainage"] = X["soil_drainage"].map(soil_drainage_mapping)
# Convert features to Float32 so ONNX handles it as a single tensor input
X = X.values.astype(np.float32)
y = df["disease_risk"].values

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train classifiers
rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

lr = LogisticRegression(max_iter=1000, random_state=42)
lr.fit(X_train, y_train)

# Evaluate
rf_pred = rf.predict(X_test)
rf_acc = accuracy_score(y_test, rf_pred)
rf_cm = confusion_matrix(y_test, rf_pred)

lr_pred = lr.predict(X_test)
lr_acc = accuracy_score(y_test, lr_pred)
lr_cm = confusion_matrix(y_test, lr_pred)

print("--- Random Forest classifier ---")
print(f"Accuracy: {rf_acc:.4f}")
print("Confusion Matrix:")
print(rf_cm)
print("Feature Importances:")
for f, imp in zip(feature_order, rf.feature_importances_):
    print(f"  {f}: {imp:.4f}")

print("\n--- Logistic Regression classifier ---")
print(f"Accuracy: {lr_acc:.4f}")
print("Confusion Matrix:")
print(lr_cm)

# Choose best classifier (target is > 0.80 test accuracy)
if rf_acc >= lr_acc:
    print(f"\nSelected Random Forest (Accuracy: {rf_acc:.4f})")
    best_clf = rf
else:
    print(f"\nSelected Logistic Regression (Accuracy: {lr_acc:.4f})")
    best_clf = lr

# 4. Export classifier to ONNX
os.makedirs("api", exist_ok=True)
initial_type = [('float_input', FloatTensorType([None, len(feature_order)]))]

# Options to disable zipmap so probability output is float array, outputs[0]=label, outputs[1]=probabilities
onx = convert_sklearn(
    best_clf,
    initial_types=initial_type,
    options={id(best_clf): {'zipmap': False}}
)

with open("api/disease_model.onnx", "wb") as f:
    f.write(onx.SerializeToString())
print("Exported model to api/disease_model.onnx")

# Save JSON Schema
schema = {
    "feature_order": feature_order,
    "soil_drainage_mapping": soil_drainage_mapping,
    "label_mapping": label_mapping
}
with open("api/disease_schema.json", "w", encoding="utf-8") as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)
print("Saved api/disease_schema.json successfully.")
