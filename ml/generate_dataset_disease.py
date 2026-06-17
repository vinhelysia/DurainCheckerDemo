import numpy as np
import pandas as pd
import os

np.random.seed(42)
n_samples = 2000

# 1. Generate environmental and orchard features
temperature_c = np.round(np.random.uniform(18.0, 38.0, n_samples), 1)
humidity_pct = np.round(np.random.uniform(50.0, 100.0, n_samples), 1)
harvest_month = np.random.randint(1, 13, n_samples)

# Rainfall is higher during rainy months (May to October)
rainfall_mm = []
for m in harvest_month:
    if 5 <= m <= 10:
        rain = np.random.normal(260, 50)
    else:
        rain = np.random.normal(80, 25)
    rainfall_mm.append(round(max(20.0, rain), 1))
rainfall_mm = np.array(rainfall_mm)

leaf_wetness_hours = np.round(np.random.uniform(0.0, 24.0, n_samples), 1)
soil_drainage = np.random.choice(["good", "medium", "poor"], size=n_samples, p=[0.4, 0.4, 0.2])
tree_age_years = np.round(np.random.uniform(1.0, 30.0, n_samples), 1)
prior_infection = np.random.choice([0, 1], size=n_samples, p=[0.75, 0.25])

soil_map = {"good": 0.0, "medium": 1.0, "poor": 2.0}
soil_numeric = np.array([soil_map[s] for s in soil_drainage])

# 2. Determine labels using scoring logic (healthy, phytophthora, anthracnose, leaf_blight)
labels = []
for i in range(n_samples):
    temp = temperature_c[i]
    hum = humidity_pct[i]
    rain = rainfall_mm[i]
    wet = leaf_wetness_hours[i]
    drain = soil_numeric[i]
    age = tree_age_years[i]
    prior = prior_infection[i]
    
    # Phytophthora risk (1): high humidity, poor soil drainage, high rainfall, history of infections
    if hum > 85.0 and drain == 2.0 and rain > 200.0:
        s_phy = 6.0 + prior * 1.5 + np.random.normal(0, 0.3)
    else:
        s_phy = (hum - 85.0) * 0.04 + (drain - 1.0) * 0.5 + (rain - 200.0) * 0.003 + prior * 0.4 + np.random.normal(0, 0.2)
        
    # Anthracnose risk (2): high humidity, warm temperature (24-32C)
    if hum > 80.0 and 24.0 <= temp <= 32.0:
        s_ant = 5.0 + np.random.normal(0, 0.3)
    else:
        s_ant = (hum - 80.0) * 0.04 + (1.5 if 24.0 <= temp <= 32.0 else -1.5) + np.random.normal(0, 0.2)
        
    # Leaf blight risk (3): long leaf wetness duration
    if wet > 12.0:
        s_blight = 4.0 + np.random.normal(0, 0.3)
    else:
        s_blight = (wet - 12.0) * 0.3 + np.random.normal(0, 0.2)
        
    # Healthy baseline score (0)
    s_healthy = 1.0 + np.random.normal(0, 0.1)
    
    scores = [s_healthy, s_phy, s_ant, s_blight]
    labels.append(np.argmax(scores))

labels = np.array(labels)

# 3. Assemble and print distribution
df = pd.DataFrame({
    "temperature_c": temperature_c,
    "humidity_pct": humidity_pct,
    "rainfall_mm": rainfall_mm,
    "leaf_wetness_hours": leaf_wetness_hours,
    "soil_drainage": soil_drainage,
    "harvest_month": harvest_month,
    "tree_age_years": tree_age_years,
    "prior_infection": prior_infection,
    "disease_risk": labels
})

print("Class distribution:")
print(df["disease_risk"].value_counts())

os.makedirs("ml", exist_ok=True)
df.to_csv("ml/disease_dataset.csv", index=False)
print("Saved dataset to ml/disease_dataset.csv successfully.")
