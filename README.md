# 🧠 MindScore — Student Mental Health Predictor

An end-to-end machine learning web app that predicts a student's mental health score (0–10) based on their lifestyle, academic habits, and social media usage.

🌐 **Live Demo:** [mental-health-score-frontend.onrender.com](https://mental-health-score-frontend.onrender.com)
⚙️ **API:** [mental-health-score-9ium.onrender.com](https://mental-health-score-9ium.onrender.com)

---

## Project Overview

MindScore combines a trained Random Forest regression model with a FastAPI backend and a Vanilla JS frontend. A user fills in a short lifestyle profile and receives an instant, personalised mental health score along with a risk-level interpretation.

> ⚕️ **Disclaimer:** MindScore is an educational tool only and does not constitute medical advice. If you are experiencing distress, please contact a qualified mental health professional.

---

## Project Structure

```
├── main.py                    # FastAPI backend with /predict endpoint
├── Mental_health_model.pkl    # Trained scikit-learn pipeline (Random Forest)
├── requirements.txt           # Python dependencies
├── mental_health_score.ipynb  # Model training & evaluation notebook
├── index.html                 # Frontend — multi-page SPA
├── style.css                  # Frontend styles
└── script.js                  # Frontend logic & API calls
```

---

## Machine Learning Model

### Dataset
- **Source:** Student Social Media And Mental Health Impact dataset
- **Size:** 5,000 rows × 13 columns
- **Target:** `Mental_Health_Score` (continuous, 0–10)

### Features Used

| Feature | Type | Description |
|---|---|---|
| `Age` | Numeric | Student age (10–100) |
| `Gender` | Categorical | Male / Female / Other |
| `Country` | Categorical | Country of residence (grouped) |
| `Academic_Level` | Categorical | High School / Undergraduate / Graduate |
| `Most_Used_Platform` | Categorical | Primary social media platform |
| `Purpose_Of_Use` | Categorical | Networking / Education / Entertainment / News |
| `Avg_Daily_Usage_Hours` | Numeric | Average daily social media usage (hrs) |
| `Daily_Unlocks` | Numeric | Number of phone unlocks per day |
| `Study_Hours` | Numeric | Daily study hours |
| `Physical_Activity_Hours` | Numeric | Daily exercise hours |
| `Sleep_Hours_Per_Night` | Numeric | Average nightly sleep (hrs) |
| `Stress_Level` | Categorical | Low / Medium / High / Very High |

Country values are grouped: India, USA, Canada, Australia, UK, Germany, Turkey, Mexico, France, and everything else mapped to `"Other"`.

### Training & Results

Three models were compared:

| Model | R² (Test) | R² (Train) | MAE | RMSE |
|---|---|---|---|---|
| Linear Regression | 0.740 | 0.724 | 0.536 | 0.676 |
| Random Forest (default) | **0.878** | 0.981 | 0.347 | 0.464 |
| Random Forest (tuned) | 0.865 | 0.955 | 0.369 | 0.487 |

The **default Random Forest** achieved the best test R² (0.878). Hyperparameter tuning via `RandomizedSearchCV` (15 iterations, 5-fold CV) produced a slightly more conservative model with lower variance.

**Best hyperparameters found:**
- `n_estimators`: 200
- `max_depth`: 15
- `min_samples_split`: 5
- `min_samples_leaf`: 2

The saved model (`Mental_health_model.pkl`) is a scikit-learn `Pipeline` that handles preprocessing and prediction in a single call.

---

## Backend — FastAPI

### Running the server

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### Endpoints

#### `GET /`
Health check. Returns a welcome string.

#### `POST /predict`
Accepts a JSON body and returns the predicted mental health score.

**Request body:**

```json
{
  "age": 21,
  "gender": "Female",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "Instagram",
  "purpose_of_use": "Entertainment",
  "avg_daily_usage_hours": 4.5,
  "daily_unlocks": 80,
  "study_hours": 5.0,
  "physical_activity_hours": 1.0,
  "sleep_hours_per_night": 7.0,
  "stress_level": "Medium"
}
```

**Response:**

```json
{
  "predicted_mental_health_score": 6.85
}
```

Interactive API docs are available at `http://127.0.0.1:8000/docs` (Swagger UI).

---

## Frontend — MindScore Web App

A single-page application with three sections:

- **Home** — Hero section with feature highlights and stats
- **Predict** — Form collecting 12 lifestyle inputs, with inline validation and a loading state
- **About** — Explains the model, score interpretation, and privacy policy

### Score Interpretation

| Score | Risk Level | Meaning |
|---|---|---|
| > 7.0 | 🟢 Low Risk | Good mental wellbeing |
| 5.0 – 7.0 | 🟡 Moderate Risk | Some areas to watch |
| < 5.0 | 🔴 High Risk | Warrants professional attention |

### Running the frontend

Serve the three files (`index.html`, `style.css`, `script.js`) from any static server, for example:

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .
```

Make sure the FastAPI backend is running and that the API URL in `script.js` points to the correct host (default: `http://127.0.0.1:8000`).

---

## Deployment

Both services are deployed on **Render**.

| Service | URL |
|---|---|
| Frontend (static site) | https://mental-health-score-frontend.onrender.com |
| Backend (FastAPI) | https://mental-health-score-9ium.onrender.com |

The frontend is served as a Render **Static Site**. The backend runs as a Render **Web Service** with the start command:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

CORS is configured to allow all origins (`allow_origins=["*"]`), so the frontend can call the API regardless of domain.

---

## Requirements

```
fastapi
uvicorn
pydantic
joblib
pandas
scikit-learn
```

Python 3.9+ is recommended. No frontend build step is required.

---

## How to Run the Full App Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the backend
uvicorn main:app --reload

# 3. In a separate terminal, serve the frontend
python -m http.server 8080

# 4. Open http://localhost:8080 in your browser
```
