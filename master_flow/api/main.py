import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
# Load the environment variables from the .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from master_flow.main import MasterFlow

# --- ADDED FOR LOGGING ---
import re
class DualLogger:
    def __init__(self, original_stdout, filename):
        self.original_stdout = original_stdout
        self.log_file = open(filename, "a", encoding="utf-8")
        self.ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        
    def write(self, text):
        self.original_stdout.write(text)
        clean_text = self.ansi_escape.sub('', text)
        self.log_file.write(clean_text)
        self.log_file.flush()
        
    def flush(self):
        self.original_stdout.flush()
        self.log_file.flush()

sys.stdout = DualLogger(sys.stdout, "temp_master_flow.log")
sys.stderr = sys.stdout
# -------------------------

from typing import Optional
import asyncio
from master_flow.model.system_state import SystemState

app = FastAPI()

active_flows = {}  # In-memory dictionary to track background generation tasks

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://cariskill-frontend.vercel.app","http://cariskill-frontend.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



class StartMacroRequest(BaseModel):
    session_id: str
    topic: str
    experience: str
    goal: str
    constraints: str

@app.post("/api/start_macro")
async def start_macro_endpoint(req: StartMacroRequest):
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id is required.")
        
    flow = MasterFlow(tracing=True)
    
    # Instantiate persistence layer to check if a session already exists
    from crewai.flow.persistence import SQLiteFlowPersistence
    persistence = SQLiteFlowPersistence()
    previous_state = persistence.load_state(req.session_id)
    
    # If a previous state exists, completely hydrate our newly instantiated flow
    if previous_state:
        print(f"Resuming existing flow. Hydrating {req.session_id}...")
        for key, value in previous_state.items():
            if hasattr(flow.state, key):
                setattr(flow.state, key, value)
    
    # Initialize the state explicitly with the requested macro fields
    flow.state.id = req.session_id
    flow.state.topic = req.topic
    flow.state.experience = req.experience
    flow.state.goal = req.goal
    flow.state.constraints = req.constraints
    
    print(f"Starting macro flow for session {flow.state.id} with topic: {req.topic}")
    
    # Initialize state in dictionary
    active_flows[req.session_id] = {"status": "processing"}

    async def execute_flow():
        try:
            result = await flow.kickoff_async() 
            response_data = result if isinstance(result, dict) else {"status": "completed", "result": result}
            final_response = {
                "status": "completed",
                "response": response_data,
                "state": flow.state.model_dump(),
                "session_id": flow.state.id
            }
            active_flows[req.session_id] = final_response
            
            import json
            with open("temp_master_flow_output.json", "w", encoding="utf-8") as f:
                json.dump(final_response, f, indent=2)
                
        except Exception as e:
            print(f"Error during CrewAI execution: {str(e)}")
            active_flows[req.session_id] = {"status": "error", "message": str(e)}

    # Dispatch to background task to prevent browser HTTP timeout
    asyncio.create_task(execute_flow())
        
    return {"status": "processing", "session_id": req.session_id}


@app.get("/api/macro_status/{session_id}")
async def get_macro_status(session_id: str):
    if session_id in active_flows:
        return active_flows[session_id]
    
    # If not found in active memory, check if persistence DB has it marked complete (future implementation)
    return {"status": "unknown"}
