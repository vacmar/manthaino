from pydantic import BaseModel, Field
from typing import List, Optional

class PathRecommendation(BaseModel):
    recommended_node_id: str = Field(description="The ID of the node the learner should tackle next.")
    reasoning: str = Field(description="Explanation for why this node is recommended based on the gap analysis.")

class TutorResponse(BaseModel):
    message: str = Field(description="The response to the user, keeping in mind not to give away direct answers.")
    hints_provided: int = Field(description="Number of hints given in this message.")
