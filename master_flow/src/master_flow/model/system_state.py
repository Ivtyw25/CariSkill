from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict

class SystemState(BaseModel):
    id: Optional[str] = None
    
    # Internal usage fields for exclusion checks
    raw_research: Optional[Any] = None
    roadmap: Optional[Any] = None
    critic_feedback: Optional[Any] = None
    is_approved: bool = False

    # User payload fields
    topic: str = ""
    experience: str = ""
    goal: str = ""
    constraints: str = ""

    # --- MACRO PLANNING FIELDS ---
    blueprint: Optional[Dict] = None

    # --- MICRO LEARNING FIELDS ---
    pending_nodes: list = []
    completed_modules: list = []
    chat_history: list = []

    # --- PERFORMANCE TRACKING ---
    macro_duration: float = 0.0
    micro_duration: float = 0.0
