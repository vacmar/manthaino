from fastapi import FastAPI

app = FastAPI(title="manthaino AI Service")

@app.get("/health")
def health_check():
    return {"status": "ok"}
