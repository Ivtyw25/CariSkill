import os
import json
from crewai.tools import tool
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from ddgs import DDGS

# We use a getter for clients to avoid crushing the process if env vars are missing at startup
_qdrant_client = None
_embedding_model = None

def get_qdrant_client():
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(
            url=os.getenv("QDRANT_URL", "http://localhost:6333"),
            api_key=os.getenv("QDRANT_API_KEY", "")
        )
    return _qdrant_client

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer('BAAI/bge-small-en-v1.5')
    return _embedding_model

@tool("Web Syllabus Search")
def web_syllabus_search(skill: str) -> str:
    """Fetches course syllabus and curriculum steps from the web when local database fails. Use this to find the live industry standard roadmap for a skill."""
    skill_query = skill.get("skill", skill) if isinstance(skill, dict) else skill
    
    try:
        # We prompt DuckDuckGo to find step-by-step learning roadmaps or course syllabi
        response = DDGS().text(f"Best learning roadmap or complete step-by-step course syllabus for {skill_query} 2026", max_results=3)
        
        results = list(response)
        
        if not results:
            return f"No web results found for {skill_query}."
            
        formatted_results = [f"Found {len(results)} relevant articles. Use this information to construct a standard learning curriculum for {skill_query}, and MAKE SURE to include the URLs as references:"]
        
        for idx, result in enumerate(results):
            title = result.get("title", "Unknown Title")
            url = result.get("href", "")
            content = result.get("body", "")[:1000] # Take first 1000 characters of each top result
            
            formatted_results.append(f"\n--- Source {idx+1} ---\nTitle: {title}\nURL: {url}\nContent Snippet: {content}")
            
        return "\n".join(formatted_results)
    except Exception as e:
        return f"Error retrieving web results for {skill_query}: {e}"

@tool("Qdrant Syllabus Search")
def search_syllabi(query: str) -> str:
    """Searches the Qdrant database for top course syllabi matching the skill query."""
    query_str = query.get("query", query) if isinstance(query, dict) else query
    
    try:
        model = get_embedding_model()
        client = get_qdrant_client()
        
        vector = model.encode(query_str).tolist()
        results = client.query_points(
            collection_name="course_materials",
            query=vector,
            limit=5
        ).points

        formatted_results = []
        for res in results:
            # Only accept highly confident matches! Adjust the threshold based on your model's typical scores.
            if hasattr(res, 'score') and res.score < 0.60:
                continue
                
            # Note: mapping 'course_name' based on vector_store payload, or default to 'name'
            name_val = res.payload.get('course_name') or res.payload.get('name')
            formatted_results.append(f"Course: {name_val}\nLevel: {res.payload.get('level')}\nSyllabus: {res.payload.get('text')}")
            
        if not formatted_results:
            return "ERROR_NOT_FOUND: The local database does not contain this skill or no high-confidence match. You MUST use the 'Web Syllabus Search' tool instead."
            
        return "\n\n---\n\n".join(formatted_results)
    except Exception as e:
        return f"ERROR_DATABASE_FAILURE: Qdrant database error: {e}. You MUST fall back to using the 'Web Syllabus Search' tool immediately."
