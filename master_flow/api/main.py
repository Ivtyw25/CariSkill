import sys
import os
import uuid
import shutil
import asyncio
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
from master_flow.main import MasterFlow
from master_flow.model.system_state import SystemState

# Load the environment variables from the .env file
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

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

app = FastAPI()

active_flows = {}  # In-memory dictionary to track background generation tasks
active_podcasts = {} # In-memory dictionary to track podcast generation tasks
PODCAST_DIR = os.path.join(os.path.dirname(__file__), "temp_podcasts")
os.makedirs(PODCAST_DIR, exist_ok=True)

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","https://cariskill-frontend.vercel.app","http://cariskill-frontend.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PodcastRequest(BaseModel):
    topic: Optional[str] = None
    urls: Optional[List[str]] = None
    text: Optional[str] = None
    session_id: str

@app.post("/api/podcast/generate")
async def generate_podcast_endpoint(req: PodcastRequest):
    if not any([req.topic, req.urls, req.text]):
        raise HTTPException(status_code=400, detail="Either topic, urls, or text must be provided.")
    
    task_id = str(uuid.uuid4())
    active_podcasts[task_id] = {"status": "processing", "session_id": req.session_id}

    async def run_podcast_generation():
        try:
            from podcastfy.client import generate_podcast
            
            # Generate the podcast audio file using asyncio.to_thread as podcastfy is sync
            audio_path = await asyncio.to_thread(
                generate_podcast,
                topic=req.topic,
                urls=req.urls,
                text=req.text,
                tts_model='edge'
            )
            
            if not audio_path or not os.path.exists(audio_path):
                raise Exception("Podcast generation failed to produce a file.")

            # Move file to our local temp directory for serving
            local_filename = f"{task_id}.mp3"
            local_path = os.path.join(PODCAST_DIR, local_filename)
            shutil.move(audio_path, local_path)

            active_podcasts[task_id] = {
                "status": "completed",
                "file_path": local_path,
                "session_id": req.session_id
            }
            print(f"Podcast {task_id} generated successfully: {local_path}")

        except Exception as e:
            print(f"Podcast generation error: {str(e)}")
            active_podcasts[task_id] = {"status": "error", "message": str(e)}

    asyncio.create_task(run_podcast_generation())
    return {"status": "processing", "task_id": task_id}

@app.get("/api/podcast/status/{task_id}")
async def get_podcast_status(task_id: str):
    if task_id in active_podcasts:
        status_data = active_podcasts[task_id].copy()
        # Don't expose internal file paths to the frontend
        status_data.pop("file_path", None)
        return status_data
    return {"status": "unknown"}

@app.get("/api/podcast/download/{task_id}")
async def download_podcast(task_id: str):
    if task_id not in active_podcasts or active_podcasts[task_id]["status"] != "completed":
        raise HTTPException(status_code=404, detail="Podcast not found or not yet completed.")
    
    file_path = active_podcasts[task_id]["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Audio file missing from server.")
        
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=f"CariSkill_Podcast_{task_id[:8]}.mp3"
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
