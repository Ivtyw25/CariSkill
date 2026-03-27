import asyncio
import os
from typing import List
from google import genai
from google.genai import types
from tavily import AsyncTavilyClient

# Import your models
from master_flow.model.micro_models import SCoTSynthesizerResponse, MacroNodeContent

async def fetch_tavily_context_parallel(topic_title: str, micro_topics: List[str]) -> str:
    """Fires 3 highly targeted searches at exactly the same time."""
    client = AsyncTavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))
    micro_str = ", ".join(micro_topics)
    
    # Define our 3 distinct search angles
    queries = [
        f"Core theory and definition of {topic_title} focusing on {micro_str}",
        f"Step-by-step real world examples of {topic_title}",
        f"Common mistakes and advanced concepts regarding {topic_title}"
    ]
    
    print(f"[BACKEND] 🔍 Firing 3 parallel Tavily searches for: {topic_title}...")
    
    # asyncio.gather fires them all simultaneously!
    results = await asyncio.gather(
        client.search(query=queries[0], search_depth="basic", max_results=2),
        client.search(query=queries[1], search_depth="basic", max_results=2),
        client.search(query=queries[2], search_depth="basic", max_results=2),
        return_exceptions=True
    )
    
    # Combine all the search results into one massive context string
    combined_context = ""
    for idx, res in enumerate(results):
        if isinstance(res, dict) and "results" in res:
            for item in res["results"]:
                combined_context += f"Source ({queries[idx]}): {item.get('content', '')}\n\n"
                
    return combined_context

async def generate_micro_theory_single_shot(
    node_id: str,
    module_title: str,
    suggested_micro_topics: List[str]
) -> MacroNodeContent:
    """The Master Controller: Runs Search -> Runs Gemini -> Returns Data"""
    
    # 1. Get the context insanely fast
    tavily_context = await fetch_tavily_context_parallel(module_title, suggested_micro_topics)
    
    # 2. Fire the SCoT AI Pipeline
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    system_instruction = f"""
    You are an elite AI Educational Architect building a detailed curriculum module.
    MODULE TITLE: {module_title}
    REQUIRED MICRO-TOPICS: {', '.join(suggested_micro_topics)}
    
    RUBRIC FOR CONFIDENCE SCORE (0.0 to 1.0):
    - 1.0: Every micro-topic is covered exhaustively using the provided context, with real-world examples.
    - < 0.7: Missing critical micro-topics or contradicting the context.
    """

    prompt = f"Using the following verified search data, generate the curriculum structure:\n\n{tavily_context}"

    print(f"[BACKEND] 🧠 Initiating SCoT Synthesizer for node: {node_id}...")

    try:
        # ATTEMPT 1: Normal Temp
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4, 
                response_mime_type="application/json",
                response_schema=SCoTSynthesizerResponse,
            )
        )
        result: SCoTSynthesizerResponse = response.parsed
        
        if result.confidence_score >= 0.7:
            print(f"[BACKEND] ✅ Generation Successful! Confidence: {result.confidence_score}")
            return result.final_payload
            
        print(f"[BACKEND] ⚠️ Low confidence ({result.confidence_score}). Triggering strict retry...")

    except Exception as e:
        print(f"[BACKEND] ❌ Attempt 1 Failed: {str(e)}. Triggering fallback...")

    # ATTEMPT 2: Fallback Strict Temp
    print(f"[BACKEND] 🔄 Executing Attempt 2 (Strict Mode)...")
    fallback_prompt = prompt + "\n\nCRITICAL INSTRUCTION: Strictly adhere to the facts. Maximize depth."
    
    response_retry = await client.aio.models.generate_content(
        model='gemini-2.5-flash',
        contents=fallback_prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.1,
            response_mime_type="application/json",
            response_schema=SCoTSynthesizerResponse,
        )
    )
    
    result_retry: SCoTSynthesizerResponse = response_retry.parsed
    print(f"[BACKEND] 🏁 Fallback Complete. Final Confidence: {result_retry.confidence_score}")
    
    # We must explicitly inject the node_id into the Pydantic object before returning it
    result_retry.final_payload.node_id = node_id
    return result_retry.final_payload