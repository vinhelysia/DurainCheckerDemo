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

# 1. Load data
df = pd.read_csv("ml/dataset.csv")

# 2. Schema definition
province_mapping = {
    "Lâm Đồng": 0,
    "Tiền Giang": 1,
    "Đắk Lắk": 2,
    "Bến Tre": 3,
    "Đồng Nai": 4
}
label_mapping = {
    0: "low",
    1: "medium",
    2: "high"
}
feature_order = ["province", "harvest_month", "farm_violation_history", "rainfall_mm"]

# Preprocess
X = df[feature_order].copy()
X["province"] = X["province"].map(province_mapping)
# Convert features to float32 so ONNX handles it as a single Float32 tensor input
X = X.values.astype(np.float32)
y = df["risk_level"].values

# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 3. Train models
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

print("--- Random Forest ---")
print(f"Accuracy: {rf_acc:.4f}")
print("Confusion Matrix:")
print(rf_cm)
print("Feature Importances:")
for f, imp in zip(feature_order, rf.feature_importances_):
    print(f"  {f}: {imp:.4f}")

print("\n--- Logistic Regression ---")
print(f"Accuracy: {lr_acc:.4f}")
print("Confusion Matrix:")
print(lr_cm)
print("Coefficients:")
print(lr.coef_)

# Select better model
if rf_acc >= lr_acc:
    print(f"\nSelected Random Forest (Accuracy: {rf_acc:.4f})")
    best_model = rf
else:
    print(f"\nSelected Logistic Regression (Accuracy: {lr_acc:.4f})")
    best_model = lr

# 4. Export to ONNX
os.makedirs("api", exist_ok=True)
initial_type = [('float_input', FloatTensorType([None, 4]))]

# User requested option to disable zipmap
onx = convert_sklearn(
    best_model, 
    initial_types=initial_type,
    options={id(best_model): {'zipmap': False}}
)

with open("api/model.onnx", "wb") as f:
    f.write(onx.SerializeToString())
print("Exported model to api/model.onnx")

# Save schema
schema = {
    "feature_order": feature_order,
    "province_mapping": province_mapping,
    "label_mapping": label_mapping
}
with open("api/feature_schema.json", "w", encoding="utf-8") as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)
print("Saved api/feature_schema.json")
