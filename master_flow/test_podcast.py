import requests
import time
import os

# Configuration
BASE_URL = "http://localhost:8000"
SESSION_ID = "test-session-123"
DUMMY_TEXT = """
Computer Science is the study of algorithmic processes, computational machines and computation itself. 
As a discipline, computer science spans a range of topics from theoretical studies of algorithms, 
computation and information to the practical issues of implementing computing systems in hardware and software.
"""

def test_podcast_flow():
    print("--- 1. Starting Podcast Generation ---")
    payload = {
        "text": DUMMY_TEXT,
        "session_id": SESSION_ID
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/podcast/generate", json=payload)
        response.raise_for_status()
        data = response.json()
        task_id = data.get("task_id")
        print(f"Task created! Task ID: {task_id}")
    except Exception as e:
        print(f"Failed to start generation: {e}")
        return

    print("\n--- 2. Polling for Status (Every 5s) ---")
    while True:
        try:
            status_resp = requests.get(f"{BASE_URL}/api/podcast/status/{task_id}")
            status_resp.raise_for_status()
            status_data = status_resp.json()
            status = status_data.get("status")
            
            print(f"Current Status: {status}")
            
            if status == "completed":
                print("Generation finished!")
                break
            elif status == "error":
                print(f"Error occurred during generation: {status_data.get('message')}")
                return
            
            time.sleep(5)
        except Exception as e:
            print(f"Polling error: {e}")
            break

    print("\n--- 3. Downloading Final MP3 ---")
    try:
        download_resp = requests.get(f"{BASE_URL}/api/podcast/download/{task_id}", stream=True)
        download_resp.raise_for_status()
        
        output_file = "test_output.mp3"
        with open(output_file, "wb") as f:
            for chunk in download_resp.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"Success! Saved podcast to: {os.path.abspath(output_file)}")
    except Exception as e:
        print(f"Download failed: {e}")

if __name__ == "__main__":
    # Ensure the server is running before executing
    test_podcast_flow()
