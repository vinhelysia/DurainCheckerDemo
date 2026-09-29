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

# Synthetic demonstration only; never use test to select a classifier.
if not np.isfinite(X).all():
    raise ValueError("Unknown mapping or non-finite feature in synthetic dataset")
X_development, X_test, y_development, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)
X_train, X_val, y_train, y_val = train_test_split(
    X_development, y_development, test_size=0.25, random_state=42, stratify=y_development)

# 3. Train models
rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

lr = LogisticRegression(max_iter=1000, random_state=42)
lr.fit(X_train, y_train)

# Evaluate
rf_pred = rf.predict(X_val)
rf_acc = accuracy_score(y_val, rf_pred)
rf_cm = confusion_matrix(y_val, rf_pred)

lr_pred = lr.predict(X_val)
lr_acc = accuracy_score(y_val, lr_pred)
lr_cm = confusion_matrix(y_val, lr_pred)

print("--- Random Forest ---")
print(f"Synthetic-only validation accuracy: {rf_acc:.4f}")
print("Synthetic-only validation confusion matrix:")
print(rf_cm)
print("Feature Importances:")
for f, imp in zip(feature_order, rf.feature_importances_):
    print(f"  {f}: {imp:.4f}")

print("\n--- Logistic Regression ---")
print(f"Synthetic-only validation accuracy: {lr_acc:.4f}")
print("Synthetic-only validation confusion matrix:")
print(lr_cm)
print("Coefficients:")
print(lr.coef_)

# Select better model
if rf_acc >= lr_acc:
    print(f"\nSelected Random Forest (Synthetic-only validation accuracy: {rf_acc:.4f})")
    best_model = rf
else:
    print(f"\nSelected Logistic Regression (Synthetic-only validation accuracy: {lr_acc:.4f})")
    best_model = lr

# Evaluate the selected model once on the held-out synthetic test.
test_prediction = best_model.predict(X_test)
print(f"Synthetic-only held-out test accuracy: {accuracy_score(y_test, test_prediction):.4f}")
print("Synthetic-only held-out test confusion matrix:")
print(confusion_matrix(y_test, test_prediction))

# 4. Export to ONNX
output_dir = "tmp/ai-training/tabular-risk"
os.makedirs(output_dir, exist_ok=True)
initial_type = [('float_input', FloatTensorType([None, 4]))]

# User requested option to disable zipmap
onx = convert_sklearn(
    best_model, 
    initial_types=initial_type,
    options={id(best_model): {'zipmap': False}}
)

with open(os.path.join(output_dir, "model.onnx"), "wb") as f:
    f.write(onx.SerializeToString())
print("Exported model to tmp/ai-training/tabular-risk/model.onnx")

# Save schema
schema = {
    "feature_order": feature_order,
    "province_mapping": province_mapping,
    "label_mapping": label_mapping,
    "data_status": "synthetic_demo_only",
    "production_ready": False
}
with open(os.path.join(output_dir, "feature_schema.json"), "w", encoding="utf-8") as f:
    json.dump(schema, f, ensure_ascii=False, indent=2)
print("Saved tmp/ai-training/tabular-risk/feature_schema.json")
