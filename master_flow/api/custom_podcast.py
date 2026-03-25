import os
import sys
import asyncio
import subprocess
import wave
import base64
import uuid
from pathlib import Path
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
    Write a short, engaging 2-person podcast dialogue about '{topic}'.
    The conversation should be educational but conversational.
    
    Format the output STRICTLY like this:
    Host: [dialogue]
    Guest: [dialogue]
    
    Keep it to about 6-8 exchanges total.
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
        print(f"\n[SUCCESS] Podcast generated at: {mp3_path.absolute()}")
        return mp3_path
    except Exception as e:
        print(f"[PIPELINE ERROR] {e}")

if __name__ == "__main__":
    # Test Block
    TEST_TOPIC = "How AI models are trained: From data collection to reinforcement learning."
    
    print("--- STARTING CUSTOM MULTI-SPEAKER PODCAST TEST ---")
    if not API_KEY:
        print("[WARN] GEMINI_API_KEY not found in .env. This will likely fail.")
    
    asyncio.run(run_custom_podcast_pipeline(TEST_TOPIC))
