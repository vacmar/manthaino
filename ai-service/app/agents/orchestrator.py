import os
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from app.tools.path_tools import get_skill_gaps, get_candidate_paths
from app.context.context_builder import build_learner_context
from app.models.structured_outputs import PathRecommendation
import json

def get_llm():
    # Use the model defined in the environment or fallback to Llama-3.1
    repo_id = os.getenv("LLM_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    token = os.getenv("HUGGINGFACEHUB_API_TOKEN")
    
    if not token:
        raise ValueError("HUGGINGFACEHUB_API_TOKEN is not set in the environment.")
        
    llm = HuggingFaceEndpoint(
        repo_id=repo_id, 
        temperature=0.1, 
        huggingfacehub_api_token=token.strip()
    )
    return ChatHuggingFace(llm=llm)

def run_orchestration(learner_id: str, query: str) -> dict:
    # 1. Gather Context (Mock Database Hits)
    context = build_learner_context(learner_id)
    gaps = get_skill_gaps.invoke({"learner_id": learner_id})
    paths = get_candidate_paths.invoke({"learner_id": learner_id})
    
    # 2. Setup the Parser for strict JSON output
    parser = PydanticOutputParser(pydantic_object=PathRecommendation)
    
    # 3. Build the Prompt Template
    system_prompt = """You are the adaptive learning orchestrator for Manthaino.
Your job is to recommend the best next learning node for the learner based on their skill gaps and the available candidate paths.

Learner Context:
{context}

Skill Gaps:
{gaps}

Candidate Paths:
{paths}

Learner Query:
{query}

{format_instructions}
"""
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Please provide your recommendation.")
    ])
    
    # 4. Execute the LLM Chain
    try:
        llm = get_llm()
        chain = prompt | llm | parser
        
        recommendation: PathRecommendation = chain.invoke({
            "context": context,
            "gaps": gaps,
            "paths": paths,
            "query": query,
            "format_instructions": parser.get_format_instructions()
        })
    except Exception as e:
        # Fallback in case the open-source model fails to format JSON correctly
        # or if the API key is missing/rate limited.
        print(f"LLM Error: {e}")
        recommendation = PathRecommendation(
            recommended_node_id="course_101",
            reasoning=f"Fallback generated. LLM Failed to respond correctly: {e}"
        )
    
    return {
        "context_used": context,
        "tools_called": ["get_skill_gaps", "get_candidate_paths"],
        "recommendation": recommendation.model_dump()
    }
