# CariSkill - Setup Guide

Welcome to **CariSkill**, an AI-driven career development platform. This guide provides step-by-step instructions to get the project running on your local machine.

---

## 1. Prerequisites

Ensure you have the following installed:
- **Node.js** (v18.x or higher)
- **Python** (v3.10 to v3.12)
- **uv** (Astral's Python package installer - for blazing-fast setup)
- **FFmpeg** (Required for podcast generation)

---

## 2. Environment Variables Setup

You need to configure environment variables for both the backend and frontend. Create a `.env` file in the **root directory** and the **`web` directory**.

### Root / Backend Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Frontend Environment Variables (`web/.env.local`)
Create a `.env.local` file in the `web/` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## 3. Automated Setup

We provide a specialized setup script that automates virtual environment creation, backend dependency installation (via `uv`), and frontend dependency installation.

From the root directory, run:
```bash
npm run setup
```
*This command executes `python setup.py`, which uses `uv` for maximum performance.*

---

## 4. Manual Setup (Alternative)

If you prefer to set up the components individually:

### Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd master_flow
   ```
2. Create and activate a virtual environment:
   ```bash
   uv venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```
4. Install Playwright browsers:
   ```bash
   python -m playwright install
   ```

### Frontend (Next.js)
1. Navigate to the frontend directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## 5. Running the Application

### Option A: Run Everything (Recommended)
From the root directory, run both servers concurrently:
```bash
npm run dev:all
```
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:8000

### Option B: Run Individually

**Start Backend:**
```bash
npm run dev:backend
# OR manually:
cd master_flow && uv run uvicorn api.main:app --reload --port 8000
```

**Start Frontend:**
```bash
npm run dev:frontend
# OR manually:
cd web && npm run dev
```

---

## 6. Troubleshooting

- **FFmpeg:** If podcast generation fails, ensure `ffmpeg` is accessible in your system's PATH.
- **Python Version:** Ensure you are using Python 3.10 - 3.12. Newer versions (like 3.13) may have compatibility issues with certain dependencies.
- **Supabase Keys:** Ensure your `SUPABASE_SERVICE_ROLE_KEY` is kept secret and not exposed to the client.
