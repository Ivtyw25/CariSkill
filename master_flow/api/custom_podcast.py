import os
import sys
import asyncio
import subprocess
import wave
import base64
import uuid
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

async def upload_to_supabase(file_path: Path, topic: str) -> str:
    # Read the exact Next.js environment variables
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("[ERROR] Supabase keys missing. Returning local path.")
        return str(file_path)

    supabase: Client = create_client(url, key)
    bucket_name = "cariskill-media"
    
    # Create a safe, unique filename
    safe_topic = "".join([c if c.isalnum() else "_" for c in topic[:30]])
    file_name = f"podcasts/{safe_topic}_{uuid.uuid4().hex[:8]}.mp3"
    
    print(f"[SUPABASE] Uploading to {file_name}...")
    
    try:
        with open(file_path, 'rb') as f:
            supabase.storage.from_(bucket_name).upload(
                path=file_name,
                file=f.read(),
                file_options={"content-type": "audio/mpeg"}
            )
        
        # Return the public URL
        return supabase.storage.from_(bucket_name).get_public_url(file_name)
    except Exception as e:
        print(f"[SUPABASE ERROR] {e}")
        return str(file_path)

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
TEMP_DIR = Path(os.path.join(os.path.dirname(__file__), "temp_podcasts"))
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Initialize the Client
client = genai.Client(api_key=API_KEY)

def generate_podcast_script(topic: str) -> str:
    """
    Uses Gemini to write a short, engaging 2-person dialogue.
    """
    print(f"[SCRIPT] Writing podcast script for topic: {topic}...")
    
    prompt = f"""
    Write a conversational, 2-person podcast dialogue about '{topic}'.
    The conversation should be educational but conversational.
    
    DYNAMIC LENGTH & EXHAUSTIVE COVERAGE MANDATE: You must scale the length of this podcast directly to the depth of the provided input text. 
    1. DO NOT summarize. You MUST cover EVERY SINGLE sub-topic provided in the input text in exhaustive detail.
    2. If the input is short, produce a highly focused, punchy episode. If the input is massive, produce a comprehensive, long-form masterclass.
    3. Expand on the concepts by having the hosts provide real-world examples and debate nuances, but DO NOT invent artificial filler, unrelated tangents, or repetitive banter just to extend the length.
    4. Treat the input text as a syllabus that you must teach in full, adapting your time to the material.

    CRITICAL PRONUNCIATION RULES: You are writing a script that will be read by a Text-to-Speech engine. 
    You MUST NEVER use Markdown symbols, asterisks, hashtags, or LaTeX (like $, \, ^, _, or $$). 
    You MUST spell out all math formulas, code snippets, and symbols in plain English phonetic words. 
    For example, instead of writing $E=mc^2$, you must write E equals M C squared. 
    Instead of O(N^2), write Big O of N squared.

    Format the output STRICTLY like this:
    Host: [dialogue]
    Guest: [dialogue]
    """
    
    # Using gemini-2.5-flash as requested by the user
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    
    return response.text

async def generate_podcast_audio(script_text: str, task_id: str) -> Path:
    """
    Uses Gemini's multi-speaker TTS to generate podcast audio.
    """
    print(f"[AUDIO] Generating multi-speaker audio for task {task_id}...")
    
    # Configure the multi-speaker voices using the correct SDK syntax
    speech_config = types.SpeechConfig(
        multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
            speaker_voice_configs=[
                types.SpeakerVoiceConfig(
                    speaker="Host",
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                    )
                ),
                types.SpeakerVoiceConfig(
                    speaker="Guest",
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                    )
                )
            ]
        )
    )
    
    # Generate the content with AUDIO modality
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=script_text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=speech_config
        )
    )
    
    # Extract raw PCM bytes from the response
    try:
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        # Explicit safety check: decode if it's a base64 string
        if isinstance(audio_data, str):
            audio_bytes = base64.b64decode(audio_data)
        else:
            audio_bytes = audio_data
        
        print(f"[DEBUG] Saving {len(audio_bytes)} bytes of PCM audio...")
    except (AttributeError, IndexError) as e:
        print(f"[ERROR] Failed to extract audio data from response: {e}")
        raise

    # Save as 24000Hz, 1-channel, 16-bit WAV
    wav_path = TEMP_DIR / f"{task_id}_temp.wav"
    print(f"[WAV] Saving raw PCM to {wav_path}...")
    
    with wave.open(str(wav_path), 'wb') as wf:
        wf.setnchannels(1)        # Mono
        wf.setsampwidth(2)        # 16-bit (2 bytes per sample)
        wf.setframerate(24000)    # 24kHz
        wf.writeframes(audio_bytes)

    # Convert to MP3 using FFmpeg
    mp3_path = TEMP_DIR / f"{task_id}_podcast.mp3"
    print(f"[FFMPEG] Converting to MP3: {mp3_path}...")
    
    cmd = [
        "ffmpeg", "-y",
        "-i", str(wav_path),
        "-codec:a", "libmp3lame",
        "-qscale:a", "2",
        str(mp3_path)
    ]
    
    try:
        # subprocess.run is a STRICTLY BLOCKING call
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, encoding="utf-8")
        print(f"[FFMPEG] Conversion completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] FFmpeg conversion failed with exit code {e.returncode}")
        print(f"[FFMPEG STDERR] {e.stderr}")
        raise Exception("FFmpeg conversion failed")

    # Cleanup temporary WAV ONLY after successful conversion
    if wav_path.exists():
        os.remove(wav_path)
        
    return mp3_path

async def run_custom_podcast_pipeline(topic: str):
    """
    Full pipeline: Script -> Audio -> MP3
    """
    task_id = str(uuid.uuid4())[:8]
    
    # 1. Generate Script
    script = generate_podcast_script(topic)
    print(f"\n--- SCRIPT GENERATED ---\n{script}\n")
    
    # 2. Generate Audio
    try:
        mp3_path = await generate_podcast_audio(script, task_id)
        
        # Upload to Supabase
        public_url = await upload_to_supabase(mp3_path, topic)
        
        # Cleanup the local file so your server doesn't run out of space
        if public_url.startswith("http") and mp3_path.exists():
            os.remove(mp3_path)
            
        print(f"\n[SUCCESS] Podcast available at: {public_url}")
        return public_url
    except Exception as e:
        print(f"[PIPELINE ERROR] {e}")

if __name__ == "__main__":
    # Test Block
    TEST_TOPIC = "How AI models are trained: From data collection to reinforcement learning."
    
    print("--- STARTING CUSTOM MULTI-SPEAKER PODCAST TEST ---")
    if not API_KEY:
        print("[WARN] GEMINI_API_KEY not found in .env. This will likely fail.")
    
    asyncio.run(run_custom_podcast_pipeline(TEST_TOPIC))
