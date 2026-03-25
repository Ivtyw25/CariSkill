import sys
import os
import uuid
import shutil
import asyncio
import time
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src")))
from master_flow.main import MasterFlow
from master_flow.model.system_state import SystemState

# Import the video generation pipeline
try:
    from api.video_generator import run_video_pipeline, TEMP_DIR as VIDEO_DIR
except ImportError:
    from video_generator import run_video_pipeline, TEMP_DIR as VIDEO_DIR

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
        try:
            self.original_stdout.write(text)
        except UnicodeEncodeError:
            # Fallback for Windows console that doesn't support UTF-8
            self.original_stdout.write(text.encode('ascii', 'replace').decode('ascii'))
        
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
active_videos = {} # In-memory dictionary to track video generation tasks

PODCAST_DIR = os.path.join(os.path.dirname(__file__), "temp_podcasts")
os.makedirs(PODCAST_DIR, exist_ok=True)
os.makedirs(VIDEO_DIR, exist_ok=True)

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
        start_time = time.time()
        try:
            try:
                from api.custom_podcast import run_custom_podcast_pipeline
            except ImportError:
                from custom_podcast import run_custom_podcast_pipeline
            
            # Generate the podcast audio file using our custom async pipeline
            # We prioritize topic, then text, then first URL if available
            input_text = req.topic or req.text
            if not input_text and req.urls:
                input_text = f"Content from URLs: {', '.join(req.urls)}"
                
            final_path = await run_custom_podcast_pipeline(input_text)
            
            if not final_path or not os.path.exists(final_path):
                raise Exception("Podcast generation failed to produce a file.")

            active_podcasts[task_id] = {
                "status": "completed",
                "file_path": str(final_path),
                "session_id": req.session_id
            }
            podcast_duration = time.time() - start_time
            print(f"Podcast {task_id} generated successfully: {final_path}")
            print(f"\n⏳ [DURATION TRACKER] Podcast Phase completed in: {podcast_duration:.2f} seconds\n")
            
            print('\n=========================================')
            print(' 📊 CARISKILL GENERATION TIME REPORT 📊')
            print('=========================================')
            print(f' 1️⃣ Macro Syllabus Phase: N/A')
            print(f' 2️⃣ Micro Theory & Scrape: N/A')
            print(f' 3️⃣ Podcast Generation: {podcast_duration:.2f}s')
            print('-----------------------------------------')
            print(f' 🏆 TOTAL PIPELINE TIME: {podcast_duration:.2f}s')
            print('=========================================\n')

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

# --- VIDEO GENERATION ENDPOINTS ---

class VideoRequest(BaseModel):
    text: str
    session_id: str

@app.post("/api/video/generate")
async def generate_video_endpoint(req: VideoRequest):
    if not req.text:
        raise HTTPException(status_code=400, detail="Text content must be provided.")
    
    task_id = str(uuid.uuid4())[:8]
    active_videos[task_id] = {"status": "processing", "session_id": req.session_id}

    async def run_pipeline():
        try:
            # run_video_pipeline is an async function that returns the final Path object
            final_video_path = await run_video_pipeline(req.text)
            
            if not final_video_path or not os.path.exists(final_video_path):
                raise Exception("Video generation failed to produce a file.")

            active_videos[task_id] = {
                "status": "completed",
                "file_path": str(final_video_path),
                "session_id": req.session_id
            }
            print(f"Video {task_id} generated successfully: {final_video_path}")

        except Exception as e:
            print(f"Video generation error: {str(e)}")
            active_videos[task_id] = {"status": "error", "message": str(e)}

    asyncio.create_task(run_pipeline())
    return {"status": "processing", "task_id": task_id}

@app.get("/api/video/status/{task_id}")
async def get_video_status(task_id: str):
    if task_id in active_videos:
        status_data = active_videos[task_id].copy()
        status_data.pop("file_path", None)
        return status_data
    return {"status": "unknown"}

@app.get("/api/video/download/{task_id}")
async def download_video(task_id: str):
    if task_id not in active_videos or active_videos[task_id]["status"] != "completed":
        raise HTTPException(status_code=404, detail="Video not found or not yet completed.")
    
    file_path = active_videos[task_id]["file_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file missing from server.")
        
    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=f"CariSkill_Video_{task_id}.mp4"
    )

# ----------------------------------

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
        overall_start = time.time()
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
            
            total_time = time.time() - overall_start
            macro_duration = flow.state.macro_duration
            micro_duration = flow.state.micro_duration

            print('\n=========================================')
            print(' 📊 CARISKILL GENERATION TIME REPORT 📊')
            print('=========================================')
            print(f' 1️⃣ Macro Syllabus Phase: {macro_duration:.2f}s')
            print(f' 2️⃣ Micro Theory & Scrape: {micro_duration:.2f}s')
            print(f' 3️⃣ Podcast Generation: N/A')
            print('-----------------------------------------')
            print(f' 🏆 TOTAL PIPELINE TIME: {total_time:.2f}s')
            print('=========================================\n')
                
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
