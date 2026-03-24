import subprocess
import signal
import sys
import os
import threading
import time

# --- CONFIGURATION ---
BACKEND_DIR = os.path.join(os.getcwd(), "master_flow")
FRONTEND_DIR = os.path.join(os.getcwd(), "web")

# Prepare environment with UTF-8 enforcement
env = os.environ.copy()
env["PYTHONIOENCODING"] = "utf-8"

# Detect virtual environment path
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = "python"

# Commands
BACKEND_CMD = [VENV_PYTHON, "-m", "uvicorn", "api.main:app", "--reload", "--port", "8000"]
FRONTEND_CMD = ["npm.cmd", "run", "dev"]

# --- PROCESS MANAGEMENT ---
processes = []

def log_stream(stream, prefix, color_code):
    """Reads a stream line by line and prints it with a colored prefix."""
    RESET = "\033[0m"
    try:
        # The stream is already opened with encoding="utf-8" and errors="replace" via Popen
        for line in iter(stream.readline, ""):
            if line:
                # print() might still fail on some Windows consoles if they don't support UTF-8,
                # but with modern terminals and encoding="utf-8" it's much safer.
                print(f"{color_code}{prefix}{RESET} {line.strip()}")
    except Exception as e:
        print(f"\033[91m[SYSTEM] Logging error for {prefix}: {e}\033[0m")

def cleanup():
    """Forcefully kills all started processes and their entire process trees."""
    print("\n\033[91m[SYSTEM] Shutting down all servers...\033[0m")
    for proc in processes:
        if proc.poll() is None:
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], 
                             capture_output=True, check=False)
                print(f"[SYSTEM] Killed process tree for PID {proc.pid}")
            except Exception as e:
                print(f"[SYSTEM] Error killing PID {proc.pid}: {e}")
    sys.exit(0)

def signal_handler(sig, frame):
    cleanup()

signal.signal(signal.SIGINT, signal_handler)

def main():
    # Ensure the main process stdout is also handled safely if possible
    if sys.stdout.encoding.lower() != 'utf-8' and hasattr(sys.stdout, 'reconfigure'):
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    print("\033[94m[SYSTEM] Starting CariSkill Development Servers (UTF-8 Mode)...\033[0m")
    
    # 1. Start Backend
    print(f"[SYSTEM] Launching Backend (FastAPI) at http://localhost:8000")
    backend_proc = subprocess.Popen(
        BACKEND_CMD,
        cwd=BACKEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        encoding="utf-8",
        errors="replace" # Safeguard against invalid sequences
    )
    processes.append(backend_proc)
    
    # 2. Start Frontend
    print(f"[SYSTEM] Launching Frontend (Next.js) at http://localhost:3000")
    frontend_proc = subprocess.Popen(
        FRONTEND_CMD,
        cwd=FRONTEND_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env=env,
        encoding="utf-8",
        errors="replace"
    )
    processes.append(frontend_proc)

    # 3. Start Logging Threads
    threading.Thread(target=log_stream, args=(backend_proc.stdout, "[BACKEND]", "\033[92m"), daemon=True).start()
    threading.Thread(target=log_stream, args=(frontend_proc.stdout, "[FRONTEND]", "\033[96m"), daemon=True).start()

    try:
        while True:
            if backend_proc.poll() is not None:
                print("\033[91m[SYSTEM] Backend process exited unexpectedly.\033[0m")
                break
            if frontend_proc.poll() is not None:
                print("\033[91m[SYSTEM] Frontend process exited unexpectedly.\033[0m")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()

if __name__ == "__main__":
    main()
