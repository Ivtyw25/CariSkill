import os
import subprocess
import sys

def run_command(command, cwd=None, shell=False):
    """Utility to run a shell command and print its output."""
    print(f"\n>>> Running: {' '.join(command) if isinstance(command, list) else command}")
    try:
        subprocess.run(command, cwd=cwd, shell=shell, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        sys.exit(1)

def check_uv():
    """Checks if uv is installed, if not installs it using pip."""
    try:
        subprocess.run(["uv", "--version"], capture_output=True, check=True)
        print("[SYSTEM] Astral's 'uv' is already installed.")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("[SYSTEM] 'uv' not found. Installing via pip for maximum performance...")
        subprocess.run([sys.executable, "-m", "pip", "install", "uv"], check=True)

def main():
    root_dir = os.getcwd()
    master_flow_dir = os.path.join(root_dir, "master_flow")
    web_dir = os.path.join(root_dir, "web")
    venv_dir = os.path.join(master_flow_dir, "venv")

    print("--- Starting CariSkill Environment Setup (Ultra-Fast UV Mode) ---")

    # 0. Ensure uv is installed
    check_uv()

    # 1. Create Virtual Environment using uv
    if not os.path.exists(venv_dir):
        print(f"\n[1/5] Creating virtual environment using uv in {venv_dir}...")
        # uv venv creates the venv in the current directory if no path is given, 
        # so we specify the path or change cwd.
        run_command(["uv", "venv", "venv"], cwd=master_flow_dir)
    else:
        print(f"\n[1/5] Virtual environment already exists in {venv_dir}.")

    # Define venv paths (standard structure remains the same)
    if sys.platform == "win32":
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        python_exe = os.path.join(venv_dir, "bin", "python")

    # 2. Install Python Dependencies using uv pip
    print("\n[2/5] Installing backend dependencies using uv pip...")
    
    req_file = os.path.join(master_flow_dir, "requirements.txt")
    if os.path.exists(req_file):
        # Explicitly point uv to the venv python to avoid context loss
        run_command(["uv", "pip", "install", "--python", python_exe, "-r", "requirements.txt"], cwd=master_flow_dir)
    else:
        deps = ["crewai[tools,google-genai]==1.9.3", "fastapi", "uvicorn", "qdrant-client", "sentence-transformers", "tavily-python", "python-dotenv", "google-genai", "edge-tts", "podcastfy"]
        run_command(["uv", "pip", "install", "--python", python_exe] + deps, cwd=master_flow_dir)

    # 3. Install Playwright Browsers
    print("\n[3/5] Installing Playwright browsers...")
    run_command([python_exe, "-m", "playwright", "install"])

    # 4. Install Next.js Frontend Dependencies
    print("\n[4/5] Installing frontend dependencies (npm install)...")
    if os.path.exists(web_dir):
        run_command("npm install", cwd=web_dir, shell=True)
    else:
        print("Warning: 'web' directory not found. Skipping npm install.")

    # 5. Final Warnings
    print("\n" + "="*60)
    print("      SETUP COMPLETE - BLAZING FAST WITH UV")
    print("="*60)
    print("\n[CRITICAL] FFmpeg NOT INSTALLED AUTOMATICALLY")
    print("Podcast generation requires FFmpeg to be installed on your system.")
    print("\nTo start development, run:")
    print("   npm run dev:all")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
