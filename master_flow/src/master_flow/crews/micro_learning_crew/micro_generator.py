import asyncio
import os
from typing import List
from google import genai
from google.genai import types
from tavily import AsyncTavilyClient

# Import your models
from master_flow.model.micro_models import SCoTSynthesizerResponse, MacroNodeContent

async def fetch_tavily_context_parallel(topic_title: str, micro_topics: List[str]) -> str:
    """Fires parallel searches and extracts CONTENT, TITLES, and URLS."""
    client = AsyncTavilyClient(api_key=os.environ.get("TAVILY_API_KEY"))
    micro_str = ", ".join(micro_topics)
    
    queries = [
        f"Core theory and detailed definition of {topic_title} focusing on {micro_str}",
        f"Step-by-step real world examples and tutorials for {topic_title}",
        f"Common mistakes, advanced concepts, and documentation for {topic_title}"
    ]
    
    print(f"[BACKEND] 🔍 Firing 3 parallel Tavily searches for: {topic_title}...")
    
    results = await asyncio.gather(
        client.search(query=queries[0], search_depth="basic", max_results=3),
        client.search(query=queries[1], search_depth="basic", max_results=2),
        client.search(query=queries[2], search_depth="basic", max_results=2),
        return_exceptions=True
    )
    
    combined_context = ""
    for idx, res in enumerate(results):
        if isinstance(res, dict) and "results" in res:
            for item in res["results"]:
                # WE MUST GRAB THE URL AND TITLE NOW!
                title = item.get('title', 'Untitled Resource')
                url = item.get('url', '')
                content = item.get('content', '')
                # Pass it to the AI as a formatted citation
                combined_context += f"Source Title: {title}\nURL: {url}\nContent: {content}\n\n"
                
    return combined_context

async def generate_micro_theory_single_shot(
    node_id: str,
    module_title: str,
    suggested_micro_topics: List[str],
    experience: str, # Added to match the Educator's needs
    goal: str        # Added to match the Educator's needs
) -> MacroNodeContent:
    
    tavily_context = await fetch_tavily_context_parallel(module_title, suggested_micro_topics)
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    # THE MEGA-PROMPT: Combining all 3 YAML agents into one highly strict instruction set
    system_instruction = f"""
    You are an elite AI Educational Architect and world-class instructor.
    MODULE TITLE: {module_title}
    REQUIRED MICRO-TOPICS: {', '.join(suggested_micro_topics)}
    USER EXPERIENCE LEVEL: {experience}
    USER GOAL: {goal}
    
    YOUR 3 CORE RESPONSIBILITIES:
    1. THE EDUCATOR: Write clear, highly engaging, and detailed theoretical explanations. Explain theory in detail but be concise enough not to overwhelm. Tailor the tone perfectly to the user's experience level and goal. Assign a difficulty (easy, medium, hard).
       - FORMATTING RULES: Format all output using strict Markdown (# headers, ** bold, * bullets). 
       - MATH RULES: DO NOT use backticks (`) for mathematical variables. For ALL math, formulas, and single variables (like x or y), you MUST use LaTeX wrapped in dollar signs (e.g., $x$, $y=x^2$, $$O(N^2)$$). Never use Unicode superscripts.
    
    2. THE RESEARCHER: Review the provided search context. You MUST extract the best, most relevant URLs from the context and add them to the `resources` array for each topic. Do NOT hallucinate URLs. Map them to types: 'article', 'official_doc', or 'youtube'.
    
    3. THE ESTIMATOR: Accurately estimate learning times.
       - Reading theory: ~250 words per minute.
       - External Article/Doc: ~5 mins.
       - External Video: ~10 mins.
       - Accurately sum these for `topic_total_time_minutes` and `node_total_time_minutes`.
    
    RUBRIC FOR CONFIDENCE SCORE (0.0 to 1.0):
    - 1.0: Deep, engaging theory. Strict adherence to Markdown/LaTeX rules. Real URLs included in resources. Math is perfectly calculated.
    - < 0.7: Short/lazy theory, missing URLs from context, bad formatting, or hallucinated links.
    """

    prompt = f"Using the following verified search data, generate the curriculum structure:\n\n{tavily_context}"
    print(f"[BACKEND] 🧠 Initiating Mega-SCoT Synthesizer for node: {node_id}...")

    try:
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
            result.final_payload.node_id = node_id
            return result.final_payload
            
        print(f"[BACKEND] ⚠️ Low confidence ({result.confidence_score}). Triggering strict retry...")

    except Exception as e:
        print(f"[BACKEND] ❌ Attempt 1 Failed: {str(e)}. Triggering fallback...")

    print(f"[BACKEND] 🔄 Executing Attempt 2 (Strict Mode)...")
    fallback_prompt = prompt + "\n\nCRITICAL INSTRUCTION: Strictly adhere to the facts. Maximize depth and ENSURE URLs from the context are placed in the resources array."
    
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
    
    result_retry.final_payload.node_id = node_id
    return result_retry.final_payload