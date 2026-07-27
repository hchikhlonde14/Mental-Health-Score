import warnings
import joblib
from fastapi import FastAPI

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    model = joblib.load('Mental_health_model.pkl')

app = FastAPI()

@app.get('/')
def greet():
    return "Welcome to model deployment"