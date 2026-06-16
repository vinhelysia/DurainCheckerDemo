import numpy as np
import pandas as pd
import os

np.random.seed(42)

# Config
n_samples = 2000

provinces = ["Lâm Đồng", "Tiền Giang", "Đắk Lắk", "Bến Tre", "Đồng Nai"]
province_probs = [0.2, 0.25, 0.25, 0.15, 0.15]

# Generate features
province_choices = np.random.choice(provinces, size=n_samples, p=province_probs)
harvest_months = np.random.randint(1, 13, size=n_samples)
violations = np.random.randint(0, 6, size=n_samples)

# Rainfall depends on harvest month (rainy season is May to October, i.e., months 5-10)
rainfall_list = []
for m in harvest_months:
    if 5 <= m <= 10:
        # Rainy season: higher rainfall
        rain = np.random.normal(250, 60)
    else:
        # Dry season: lower rainfall
        rain = np.random.normal(70, 30)
    rainfall_list.append(max(0.0, rain))
rainfall = np.array(rainfall_list)

# Score calculation
# baselines: Đắk Lắk: 1.2, Tiền Giang: 0.5, Đồng Nai: 0.4, Bến Tre: 0.3, Lâm Đồng: 0.1
baselines = {
    "Đắk Lắk": 1.2,
    "Tiền Giang": 0.5,
    "Đồng Nai": 0.4,
    "Bến Tre": 0.3,
    "Lâm Đồng": 0.1
}

scores = []
for i in range(n_samples):
    p = province_choices[i]
    v = violations[i]
    r = rainfall[i]
    
    base = baselines[p]
    # Low noise to ensure accuracy is high and model learns the rule perfectly
    noise = np.random.normal(0, 0.08)
    
    score = base + 0.5 * v + 0.004 * r + noise
    scores.append(score)

scores = np.array(scores)

# Map to label
# score < 1.0 -> 0 (low)
# 1.0 <= score < 2.0 -> 1 (medium)
# score >= 2.0 -> 2 (high)
labels = []
for s in scores:
    if s < 1.0:
        labels.append(0)
    elif s < 2.0:
        labels.append(1)
    else:
        labels.append(2)

labels = np.array(labels)

df = pd.DataFrame({
    "province": province_choices,
    "harvest_month": harvest_months,
    "farm_violation_history": violations,
    "rainfall_mm": np.round(rainfall, 1),
    "risk_level": labels
})

# Print class distribution
print("Class distribution:")
print(df["risk_level"].value_counts())

# Save dataset
os.makedirs("ml", exist_ok=True)
df.to_csv("ml/dataset.csv", index=False)
print("Saved ml/dataset.csv")
