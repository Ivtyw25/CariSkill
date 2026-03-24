import os
import subprocess
import sys
import venv

def run_command(command, cwd=None, shell=False):
    """Utility to run a shell command and print its output."""
    print(f"\n>>> Running: {' '.join(command) if isinstance(command, list) else command}")
    try:
        subprocess.run(command, cwd=cwd, shell=shell, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        sys.exit(1)

def main():
    root_dir = os.getcwd()
    master_flow_dir = os.path.join(root_dir, "master_flow")
    web_dir = os.path.join(root_dir, "web")
    venv_dir = os.path.join(master_flow_dir, "venv")

    print("--- Starting CariSkill Environment Setup ---")

    # 1. Create Python Virtual Environment in master_flow
    if not os.path.exists(venv_dir):
        print(f"\n[1/5] Creating virtual environment in {venv_dir}...")
        venv.create(venv_dir, with_pip=True)
    else:
        print(f"\n[1/5] Virtual environment already exists in {venv_dir}.")

    # Define venv paths
    if sys.platform == "win32":
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe")
    else:
        python_exe = os.path.join(venv_dir, "bin", "python")
        pip_exe = os.path.join(venv_dir, "bin", "pip")

    # 2. Upgrade pip and Install Python Dependencies
    print("\n[2/5] Upgrading pip and installing backend dependencies...")
    run_command([python_exe, "-m", "pip", "install", "--upgrade", "pip"])
    
    # Install base dependencies and specific new ones
    # (google-genai, edge-tts, and podcastfy are in requirements.txt or installed here)
    req_file = os.path.join(master_flow_dir, "requirements.txt")
    if os.path.exists(req_file):
        run_command([pip_exe, "install", "-r", req_file], cwd=master_flow_dir)
    else:
        run_command([pip_exe, "install", "crewai[tools,google-genai]==1.9.3", "fastapi", "uvicorn", "qdrant-client", "sentence-transformers", "tavily-python", "python-dotenv", "google-genai", "edge-tts", "podcastfy"], cwd=master_flow_dir)

    # 3. Install Playwright Browsers (Required for crewai-tools and podcastfy)
    print("\n[3/5] Installing Playwright browsers...")
    run_command([python_exe, "-m", "playwright", "install"])

    # 4. Install Next.js Frontend Dependencies
    print("\n[4/5] Installing frontend dependencies (npm install)...")
    if os.path.exists(web_dir):
        # Use shell=True for npm on Windows
        run_command("npm install", cwd=web_dir, shell=True)
    else:
        print("Warning: 'web' directory not found. Skipping npm install.")

    # 5. Final Warnings
    print("\n" + "="*60)
    print("      SETUP COMPLETE - IMPORTANT NEXT STEPS")
    print("="*60)
    print("\n[CRITICAL] FFmpeg NOT INSTALLED AUTOMATICALLY")
    print("Podcast generation requires FFmpeg to be installed on your system.")
    print("\nTo install FFmpeg:")
    print("1. Download from: https://ffmpeg.org/download.html")
    print("2. Extract and add the 'bin' folder to your system PATH.")
    print("3. Verify by running 'ffmpeg -version' in a new terminal.")
    print("\nTo start development, run:")
    print("   npm run dev:all")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
