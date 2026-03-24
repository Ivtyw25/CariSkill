# CariSkill Project Setup Guide

Welcome to **CariSkill**! This project is a comprehensive skill-building platform featuring a **FastAPI backend** (powered by CrewAI and Podcastfy) and a modern **Next.js frontend**.

Follow this guide to set up your local development environment.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your system:

1.  **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
2.  **Node.js (v18 or v20)**: [Download Node.js](https://nodejs.org/)
3.  **FFmpeg (CRITICAL)**: Required for audio processing and podcast generation.

---

## 🛠️ Step 1: Install FFmpeg (Windows)

FFmpeg is a system-level tool that cannot be installed via Python or Node.js. You **must** install it manually for the podcast features to work.

### Method A: via Winget (Recommended)
1.  Open **PowerShell** or **Command Prompt** as Administrator.
2.  Run the following command:
    ```bash
    winget install "FFmpeg (Full Edition)"
    ```

### Method B: Manual Installation
1.  Download the "Full" build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
2.  Extract the ZIP file to a permanent folder (e.g., `C:\ffmpeg`).
3.  **Add to PATH**:
    *   Press the **Windows Key**, type "Edit the system environment variables", and press Enter.
    *   Click **Environment Variables**.
    *   Under "System variables", find **Path**, select it, and click **Edit**.
    *   Click **New** and paste the path to your ffmpeg `bin` folder (e.g., `C:\ffmpeg\bin`).
    *   Click **OK** on all windows to save.

> [!CAUTION]
> **IMPORTANT**: After installing FFmpeg, you **MUST** close your current terminal/IDE and open a **completely fresh terminal window** for the changes to take effect. Verify by running `ffmpeg -version`.

---

## 🚀 Step 2: Automated Environment Setup

We provide a script that automates the creation of Python virtual environments, dependency installation, and Playwright browser setup.

1.  Open a fresh terminal in the project root.
2.  Run the setup command:
    ```bash
    npm run setup
    ```

This script will:
*   Create a virtual environment in `master_flow/venv`.
*   Install all backend Python libraries.
*   Download necessary Playwright browser binaries.
*   Install all frontend Node.js packages in the `web/` directory.

---

## 🏁 Step 3: Launching the Project

Once the setup is complete, you can start both the backend and frontend servers simultaneously using our unified starter script.

1.  In the project root, run:
    ```bash
    npm run dev:all
    ```
    *(Alternatively, run `python dev.py`)*

### What happens next?
*   **Backend (FastAPI)** will start at `http://localhost:8000`
*   **Frontend (Next.js)** will start at `http://localhost:3000`
*   Logs from both systems will be streamed to your terminal with colored prefixes (`[BACKEND]` and `[FRONTEND]`).

---

## 💡 Troubleshooting

*   **FFmpeg Errors**: If you get a "command not found" error during podcast generation, restart your computer to ensure the PATH update is recognized globally.
*   **Port Conflicts**: Ensure ports `3000` and `8000` are not being used by other applications.
*   **Python Version**: Ensure you are using Python 3.10 to 3.13.

Happy building! 🚀
