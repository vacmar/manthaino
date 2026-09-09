from fastapi import FastAPI
from app.api import goals, learners, assessments, paths, nodes, conversations, projects

app = FastAPI(title="manthaino Backend MVP")

app.include_router(goals.router)
app.include_router(learners.router)
app.include_router(assessments.router)
app.include_router(paths.router)
app.include_router(nodes.router)
app.include_router(conversations.router)
app.include_router(projects.router)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
