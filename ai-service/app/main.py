from fastapi import FastAPI
from app.api import chat

app = FastAPI(title="manthaino AI Service")

app.include_router(chat.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
