import asyncio
import os
from google import genai
from google.genai import types

from master_flow.model.macro_models import Blueprint
from master_flow.tools.search_tools import search_syllabi, web_syllabus_search

async def fetch_macro_context(topic: str) -> str:
    """Runs the exact Qdrant -> DDG fallback logic but in lightning-fast pure Python."""
    print(f"[BACKEND] 🔍 Searching Qdrant Vector DB for: {topic}...")
    
    # Run synchronous tools in a thread to avoid blocking the async event loop
    # .func extracts the raw python function from the CrewAI @tool wrapper!
    qdrant_result = await asyncio.to_thread(search_syllabi.func, topic)
    
    # Check if Qdrant failed to find a high-confidence match
    if "ERROR_NOT_FOUND" in qdrant_result or "ERROR_DATABASE_FAILURE" in qdrant_result:
        print(f"[BACKEND] ⚠️ Qdrant missed. Falling back to Tavily Web Search...")
        web_result = await asyncio.to_thread(web_syllabus_search.func, topic)
        return f"WEB SEARCH RESULTS:\n{web_result}"
        
    print(f"[BACKEND] 🎯 Qdrant Hit! Using local database syllabi.")
    return f"QDRANT DATABASE RESULTS:\n{qdrant_result}"

async def generate_macro_blueprint_single_shot(
    topic: str,
    experience: str,
    goal: str,
    constraints: str
) -> dict:
    """The Master Controller for the Macro Phase."""
    
    # 1. Get the context from your DB or the Web
    context = await fetch_macro_context(topic)
    
    # 2. Fire the Gemini Pipeline
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    system_instruction = f"""
    You are a Senior Curriculum Architect and master instructional designer.
    
    USER TOPIC: {topic}
    USER EXPERIENCE: {experience}
    USER GOAL: {goal}
    CONSTRAINTS: {constraints}
    
    YOUR MISSION:
    Synthesize the provided search data into a logical, non-linear Directed Acyclic Graph (Skill Tree). 
    Strictly adhere to the user's experience level, ruthlessly omitting basic concepts if the user is advanced.
    Ensure foundational nodes have empty prerequisites [].
    Every node must have between 3 and 10 `suggested_micro_topics`.
    """

    prompt = f"Using the following verified syllabus data, generate the Blueprint structure:\n\n{context}"
    print(f"[BACKEND] 🧠 Initiating Macro Architect for topic: {topic}...")

    try:
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4, 
                response_mime_type="application/json",
                response_schema=Blueprint, # <-- Native Pydantic Enforcement!
            )
        )
        
        result: Blueprint = response.parsed
        print(f"[BACKEND] ✅ Macro Blueprint Generation Successful!")
        
        # Return as a standard dictionary so main.py can process it easily
        return result.model_dump()
        
    except Exception as e:
        print(f"[BACKEND] ❌ Macro Generation Failed: {str(e)}")
        raise e