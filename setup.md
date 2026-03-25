# CariSkill Project Setup Guide

Welcome to **CariSkill**! This project is a comprehensive skill-building platform featuring a **FastAPI backend** (powered by CrewAI, Google GenAI, and Podcastfy) and a modern **Next.js frontend**.

Follow this guide to set up your local development environment.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your system:

1.  **Python 3.10 to 3.13**: [Download Python](https://www.python.org/downloads/)
2.  **Node.js (v18 or v20)**: [Download Node.js](https://nodejs.org/)
3.  **FFmpeg (CRITICAL)**: Required for audio processing, podcast generation, and video montage.

---

## 🛠️ Step 1: Install FFmpeg (Windows)

FFmpeg is a system-level tool. You **must** install it manually for the audio and video features to work.

### Method A: via Winget (Recommended)
1.  Open **PowerShell** or **Command Prompt** as Administrator.
2.  Run: `winget install "FFmpeg (Full Edition)"`

### Method B: Manual Installation
1.  Download the "Full" build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
2.  Extract the ZIP to `C:\ffmpeg`.
3.  **Add to PATH**: Add `C:\ffmpeg\bin` to your system environment variables.

> [!CAUTION]
> **IMPORTANT**: Close and reopen your terminal after installing FFmpeg. Verify with `ffmpeg -version`.

---

## 🔑 Step 2: Environment Variables (.env)

Create a `.env` file in `master_flow/` and a `.env.local` file in `web/` with the following keys:

### Backend (`master_flow/.env`)
```env
GEMINI_API_KEY="your_google_ai_studio_key"
QDRANT_URL="your_qdrant_instance_url"
QDRANT_API_KEY="your_qdrant_api_key"
TAVILY_API_KEY="your_tavily_key"
# Required for podcast audio cloud storage:
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Frontend (`web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
GEMINI_API_KEY="your_google_ai_studio_key"
NEXT_PUBLIC_AI_WORKER_URL="http://127.0.0.1:8000"
```

---

## 🚀 Step 3: Automated Environment Setup

Run the setup command from the project root:
```bash
npm run setup
```
This script will create the Python venv, install all backend (including `google-genai`, `edge-tts`, `podcastfy`) and frontend dependencies, and install Playwright browsers.

---

## 🏁 Step 4: Launching the Project

Start both servers simultaneously from the root:
```bash
npm run dev:all
```
*   **Backend (FastAPI)**: `http://localhost:8000`
*   **Frontend (Next.js)**: `http://localhost:3000`

Logs are prefixed with `[BACKEND]` (Green) and `[FRONTEND]` (Cyan).

---

## 💡 Troubleshooting

*   **FFmpeg Errors**: If audio/video fails, double-check your PATH and restart your IDE.
*   **Quota Limits**: If you hit Gemini API limits (429), the system will fallback to mock data where available.
*   **UTF-8**: The dev script enforces UTF-8 encoding to prevent crashes from emojis in logs.

Happy building! 🚀
