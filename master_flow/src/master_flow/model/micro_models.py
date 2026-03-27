from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
import os
from google import genai
from google.genai import types

class ScrapeResult(BaseModel):
    micro_topic: str = Field(..., description="The specific sub-topic title.")
    video_url: Optional[str] = Field(None, description="The verified YouTube URL.")
    article_url: Optional[str] = Field(None, description="The verified Article/Documentation URL.")
    context_summary: Optional[str] = Field(None, description="Brief summary of what the documentation/video covers.")

class FullScrapeResult(BaseModel):
    results: List[ScrapeResult] = Field(..., description="The complete list of scraped resources for all asked micro-topics.")

class Resource(BaseModel):
    title: str = Field(..., description="Title of the article, doc, or video.")
    url: str = Field(..., description="The actual URL to the resource.")
    type: str = Field(..., description="e.g., 'youtube', 'official_doc', 'article'")
    estimated_time_minutes: int = Field(..., description="Estimated time to consume this specific resource.")

from typing import List, Optional, Literal

class MicroTopicContent(BaseModel):
    topic_title: str = Field(..., description="Must exactly match one of the suggested_micro_topics.")
    theory_explanation: str = Field(..., description="Detailed, engaging theoretical explanation written by the Educator.")
    difficulty: Literal["easy", "medium", "hard"] = Field(..., description="Estimated difficulty level of this topic.")
    resources: List[Resource] = Field(default_factory=list, description="Curated links. Can be empty if nothing high-quality was found.")
    topic_total_time_minutes: int = Field(..., description="Total time to read the theory + consume all resources.")

class MacroNodeContent(BaseModel):
    node_id: str = Field(..., description="The ID of the macro node this content belongs to.")
    micro_topics: List[MicroTopicContent] = Field(..., description="The generated content for each micro-topic.")
    node_total_time_minutes: int = Field(..., description="Sum of all micro-topic times.")

# --- 2. THE SCoT WRAPPER SCHEMA ---
class SCoTSynthesizerResponse(BaseModel):
    """
    This wrapper forces the LLM to 'think' and grade itself BEFORE generating the final payload.
    Because LLMs generate tokens sequentially, putting the critique first improves the data quality.
    """
    internal_critique: str = Field(
        ..., 
        description="Critique the search data against the required micro-topics. What is missing? What is strong?"
    )
    confidence_score: float = Field(
        ..., 
        description="Score from 0.0 to 1.0 based strictly on the rubric."
    )
    final_payload: MacroNodeContent = Field(
        ..., 
        description="The final, perfectly formatted curriculum data."
    )