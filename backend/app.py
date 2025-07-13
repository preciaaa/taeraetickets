# To run python backend services
# uvicorn app:app --reload --port 5002

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services import facialRecognition
from services import webScrapingService

app = FastAPI()

origins = [
    "http://localhost:3000",  # React frontend origin
    "http://127.0.0.1:3000",
    # Add more origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes from service modules
app.include_router(facialRecognition.router)
app.include_router(webScrapingService.router)