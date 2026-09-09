from pydantic import BaseModel

class CompletionRequest(BaseModel):
    assessment_score: float
    practical_pass: bool
