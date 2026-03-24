import os
import sys
import asyncio
import subprocess
import json
import uuid
import shutil
from pathlib import Path
from typing import List, Dict
from dotenv import load_dotenv

# Use the new google-genai SDK
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: 'google-genai' SDK not found. Please run 'pip install google-genai'.")
    sys.exit(1)

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
TEMP_VIDEO_DIR = Path(os.path.join(os.path.dirname(__file__), "temp_videos"))
TEMP_VIDEO_DIR.mkdir(parents=True, exist_ok=True)

# Initialize the Client
client = genai.Client(api_key=API_KEY)

def generate_director_prompts(text: str) -> List[Dict]:
    """
    Uses Gemini to generate 3 cinematic video prompts based on study text.
    """
    print(f"[DIRECTOR] Analyzing text to generate cinematic prompts...")
    
    prompt = f"""
    You are a professional film director. Based on the following study text, generate exactly 3 highly descriptive, 
    cinematic video prompts for an AI video generator (Veo 3.1).
    
    TEXT: "{text}"
    
    For each prompt, include:
    1. 'visual': A detailed description of the scene, camera movement, and lighting.
    2. 'audio_cue': A description of the background sound or music.
    
    Return ONLY a valid JSON list of 3 objects:
    [
      {{"visual": "...", "audio_cue": "..."}},
      ...
    ]
    """
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    try:
        prompts = json.loads(response.text)
        return prompts[:3]
    except Exception as e:
        print(f"[ERROR] Failed to parse director prompts: {e}")
        return []

async def generate_veo_clips(task_id: str, prompts: List[Dict]) -> List[Path]:
    """
    Generates video clips for each prompt using Veo 3.1 and polls for completion.
    """
    video_paths = []
    
    for i, p in enumerate(prompts):
        print(f"[VEO] Generating clip {i+1}/3: {p['visual'][:50]}...")
        
        # Start the generation operation
        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt=p['visual']
        )
        
        # Polling for completion: Pass the whole object, not .name
        print(f"[VEO] Polling for operation...")
        while not operation.done:
            await asyncio.sleep(10)
            operation = client.operations.get(operation)
            
        if operation.error:
            print(f"[ERROR] Video generation failed: {operation.error}")
            continue
            
        # 3-step download sequence
        clip_filename = f"{task_id}_clip_{i}.mp4"
        clip_path = TEMP_VIDEO_DIR / clip_filename
        
        print(f"[VEO] Clip {i+1} completed. Downloading...")
        try:
            # 1. Access the video object from the response
            video_obj = operation.response.generated_videos[0]
            # 2. Trigger the download via the files client
            client.files.download(file=video_obj.video)
            # 3. Save the binary data to a local path
            video_obj.video.save(str(clip_path))
            
            print(f"[VEO] Saved clip to {clip_path}")
            video_paths.append(clip_path)
        except Exception as e:
            print(f"[ERROR] Failed to download/save video: {e}")

    return video_paths

def stitch_videos(task_id: str, video_paths: List[Path]) -> Path:
    """
    Stitches multiple MP4s into one using FFmpeg concat demuxer.
    """
    if not video_paths:
        raise ValueError("No video paths provided for stitching.")

    concat_file = TEMP_VIDEO_DIR / f"{task_id}_concat.txt"
    final_output = Path(os.getcwd()) / f"{task_id}_final.mp4"
    
    print(f"[FFMPEG] Creating concat file and stitching {len(video_paths)} clips...")
    
    try:
        # 1. Create concat.txt
        with open(concat_file, "w") as f:
            for path in video_paths:
                # FFmpeg requires single quotes and escaped paths in concat file
                f.write(f"file '{path.absolute()}'\n")
        
        # 2. Run FFmpeg
        cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", str(concat_file),
            "-c", "copy",
            str(final_output)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"FFmpeg error: {result.stderr}")
            
        print(f"[SUCCESS] Final video created: {final_output}")
        
        # 3. Cleanup
        os.remove(concat_file)
        for path in video_paths:
            if path.exists():
                os.remove(path)
                
        return final_output

    except Exception as e:
        print(f"[ERROR] Stitching failed: {e}")
        if concat_file.exists(): os.remove(concat_file)
        raise

async def run_video_pipeline(text: str):
    """
    Main orchestration for the video generation pipeline.
    """
    task_id = str(uuid.uuid4())[:8]
    
    # Step 1: Generate Prompts
    prompts = generate_director_prompts(text)
    if not prompts:
        print("[ERROR] No prompts generated. Aborting.")
        return
        
    print("\n--- GENERATED DIRECTOR PROMPTS ---")
    for i, p in enumerate(prompts):
        print(f"Clip {i+1}: {p['visual']}")
        print(f"Audio: {p['audio_cue']}\n")
    
    # Step 2: Generate Clips (Simulated for test block if API keys are missing)
    try:
        video_paths = await generate_veo_clips(task_id, prompts)
        
        # Step 3: Stitch
        if video_paths:
            final_video = stitch_videos(task_id, video_paths)
            print(f"\n[PIPELINE] Task {task_id} finished successfully!")
            return final_video
    except Exception as e:
        print(f"[PIPELINE] Pipeline failed: {e}")

if __name__ == "__main__":
    # Test Block
    TEST_TOPIC = "The History of Artificial Intelligence: From Turing Machines to Neural Networks."
    
    print("--- STARTING VEO 3.1 VIDEO GENERATION TEST ---")
    if not API_KEY:
        print("[WARN] GEMINI_API_KEY not found in .env. This will fail on API calls.")
    
    asyncio.run(run_video_pipeline(TEST_TOPIC))
