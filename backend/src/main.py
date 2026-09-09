from fastapi import FastAPI

app = FastAPI(title="manthaino Backend")

@app.get("/health")
def health_check():
    return {"status": "ok"}
