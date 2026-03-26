import os
import sys
import asyncio
import subprocess
import json
import uuid
import shutil
from pathlib import Path
from typing import List, Dict, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Use the new google-genai SDK
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: 'google-genai' SDK not found. Please run 'pip install google-genai'.")
    sys.exit(1)

# edge-tts for voiceover
try:
    import edge_tts
except ImportError:
    print("Warning: 'edge-tts' not found. Subprocess fallback will be used if available.")

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Configuration
API_KEY = os.getenv("GEMINI_API_KEY")
TEMP_DIR = Path(os.path.join(os.path.dirname(__file__), "temp_videos"))
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Initialize the Client
client = genai.Client(api_key=API_KEY)

def generate_director_prompts(text: str) -> Dict:
    """
    Uses Gemini to generate 3 cinematic video prompts AND an educational narration script.
    """
    print(f"[DIRECTOR] Analyzing text to generate cinematic prompts and narration script...")
    
    safe_text = text.replace("\"", "\\\"")
    prompt = f"""
    You are a professional film director and educator. Based on the following study text, 
    generate exactly 3 highly descriptive, cinematic video prompts for Veo 3.1, 
    AND a concise, ~50-word educational narration script that explains the core concepts.
    
    TEXT: "{safe_text}"
    
    Return ONLY a valid JSON object with this exact structure:
    {{
      "prompts": [
        {{"visual": "scene description", "audio_cue": "sound description"}},
        {{"visual": "scene description", "audio_cue": "sound description"}},
        {{"visual": "scene description", "audio_cue": "sound description"}}
      ],
      "narration_script": "The 50-word educational script goes here..."
    }}

    IMPORTANT: DO NOT include markdown code blocks like ```json. Output ONLY raw JSON.
    """
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    
    try:
        raw_content = response.text.strip()
        if raw_content.startswith('```'):
            # Split by newline and take everything after the first line (the ```json part)
            raw_content = raw_content.split('\n', 1)[-1]
            # Split by newline from the end and take everything before the last line (the ``` part)
            raw_content = raw_content.rsplit('\n', 1)[0].strip()
            # Safety check if it still ends with ```
            if raw_content.endswith('```'):
                raw_content = raw_content[:-3].strip()
        data = json.loads(raw_content)
        return data
    except Exception as e:
        print(f"[ERROR] Failed to parse director prompts: {e}")
        return {"prompts": [], "narration_script": ""}

async def generate_veo_clips(task_id: str, prompts: List[Dict]) -> List[Path]:
    """
    Generates video clips for each prompt using Veo 3.1 and polls for completion.
    """
    video_paths = []
    
    for i, p in enumerate(prompts):
        print(f"[VEO] Generating clip {i+1}/3: {p['visual'][:50]}...")
        
        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt=p['visual']
        )
        
        print(f"[VEO] Polling for operation...")
        while not operation.done:
            await asyncio.sleep(10)
            operation = client.operations.get(operation)
            
        if operation.error:
            print(f"[ERROR] Video generation failed: {operation.error}")
            continue
            
        clip_filename = f"{task_id}_clip_{i}.mp4"
        clip_path = TEMP_DIR / clip_filename
        
        print(f"[VEO] Clip {i+1} completed. Downloading...")
        try:
            video_obj = operation.response.generated_videos[0]
            client.files.download(file=video_obj.video)
            video_obj.video.save(str(clip_path))
            print(f"[VEO] Saved clip to {clip_path}")
            video_paths.append(clip_path)
        except Exception as e:
            print(f"[ERROR] Failed to download/save video: {e}")

    return video_paths

async def generate_narration(script_text: str, task_id: str) -> Optional[Path]:
    """
    Generates an educational voiceover using edge-tts.
    """
    print(f"[TTS] Generating narration: '{script_text[:50]}...'")
    output_path = TEMP_DIR / f"{task_id}_narration.mp3"
    
    try:
        # Use edge-tts to generate audio
        communicate = edge_tts.Communicate(script_text, "en-US-AndrewNeural")
        await communicate.save(str(output_path))
        print(f"[TTS] Narration saved to {output_path}")
        return output_path
    except Exception as e:
        print(f"[ERROR] TTS generation failed: {e}")
        return None

def stitch_videos(task_id: str, video_paths: List[Path], narration_path: Optional[Path] = None) -> Path:
    """
    Stitches multiple MP4s and merges the narration audio using FFmpeg.
    """
    if not video_paths:
        raise ValueError("No video paths provided for stitching.")

    concat_file = TEMP_DIR / f"{task_id}_concat.txt"
    final_output = Path(os.getcwd()) / f"{task_id}_final.mp4"
    
    print(f"[FFMPEG] Creating concat file and stitching {len(video_paths)} clips...")
    
    try:
        # 1. Create concat.txt
        with open(concat_file, "w", encoding="utf-8") as f:
            for path in video_paths:
                f.write(f"file '{path.absolute()}'\n")
        
        # 2. Build FFmpeg command
        # If narration exists, merge it and replace original video audio
        if narration_path and narration_path.exists():
            print(f"[FFMPEG] Merging video with narration: {narration_path.name}")
            cmd = [
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-i", str(narration_path),
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                str(final_output)
            ]
        else:
            # Simple video stitch without external audio
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
        if concat_file.exists(): os.remove(concat_file)
        if narration_path and narration_path.exists(): os.remove(narration_path)
        for path in video_paths:
            if path.exists(): os.remove(path)
                
        return final_output

    except Exception as e:
        print(f"[ERROR] Stitching failed: {e}")
        if concat_file.exists(): os.remove(concat_file)
        raise

async def run_video_pipeline(text: str):
    """
    Main orchestration for the video generation pipeline with narration.
    """
    task_id = str(uuid.uuid4())[:8]
    
    # Step 1: Generate Prompts and Script
    data = generate_director_prompts(text)
    prompts = data.get("prompts", [])
    script = data.get("narration_script", "")
    
    if not prompts or not script:
        print("[ERROR] Missing prompts or script. Aborting.")
        return
        
    print(f"\n--- NARRATION SCRIPT ---\n{script}\n")
    
    # Step 2: Generate Video Clips and Narration in parallel
    print("[PIPELINE] Launching video generation and voiceover...")
    
    video_task = generate_veo_clips(task_id, prompts)
    audio_task = generate_narration(script, task_id)
    
    video_paths, narration_path = await asyncio.gather(video_task, audio_task)
    
    # Step 3: Stitch everything together
    if video_paths:
        final_video_path = stitch_videos(task_id, video_paths, narration_path)
        print(f"\n[PIPELINE] Task {task_id} stitched successfully: {final_video_path}")

        # --- SUPABASE UPLOAD ---
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            print("[WARN] Supabase credentials missing. Returning local path.")
            return str(final_video_path)

        try:
            supabase: Client = create_client(supabase_url, supabase_key)
            bucket_name = "cariskill-media"
            file_name = f"videos/video_{task_id}.mp4"

            print(f"[SUPABASE] Uploading video to {file_name}...")
            with open(final_video_path, "rb") as f:
                supabase.storage.from_(bucket_name).upload(
                    path=file_name,
                    file=f.read(),
                    file_options={"content-type": "video/mp4"}
                )

            public_url = supabase.storage.from_(bucket_name).get_public_url(file_name)
            print(f"[SUCCESS] Video uploaded to Supabase: {public_url}")

            # Cleanup local file
            if os.path.exists(final_video_path):
                os.remove(final_video_path)
                print(f"[CLEANUP] Local video file removed.")

            return public_url

        except Exception as e:
            print(f"[ERROR] Supabase upload failed: {e}")
            return str(final_video_path)

if __name__ == "__main__":
    # Test Block
    TEST_TOPIC = "The History of Artificial Intelligence: From Turing Machines to Neural Networks."
    
    print("--- STARTING VEO 3.1 + TTS VOICE OVER TEST ---")
    if not API_KEY:
        print("[WARN] GEMINI_API_KEY not found in .env. This will fail on API calls.")
    
    asyncio.run(run_video_pipeline(TEST_TOPIC))
