# Qwen Car Agent

A vehicle voice assistant agent powered by Qwen-Max, featuring a dual-screen workbench for debugging thought chains.

## Project Structure

```
car_bot/
├── scripts/             # Data preprocessing
│   └── preprocess.py    # Extracts rules from Excel to JSON
├── server/              # FastAPI Backend
│   ├── main.py          # API Routes
│   ├── agent.py         # Qwen Agent Logic
│   ├── database.py      # SQLite Logging
│   └── data/            # Knowledge Base storage
├── client/              # React Frontend (Vite + AntD)
│   ├── src/pages/       # Workbench & KnowledgeBase views
└── VR_Feature_List_demo.xlsx # Original Source
```

## Prerequisites

1. Python 3.9+
2. Node.js 16+
3. DashScope API Key (Qwen)

## Setup & Run

### 1. Data Preprocessing (Already Done)
The `server/data/knowledge_base.json` has already been generated from the Excel file.
If you need to regenerate it:
```bash
python scripts/preprocess.py
```

### 2. Backend (Server)
```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Export your API Key
export DASHSCOPE_API_KEY="sk-..."

# Run Server (Port 8000)
uvicorn main:app --reload
```

### 3. Frontend (Client)
```bash
cd client
npm install
npm run dev
```
Access the UI at http://localhost:5173

## Features
- **Workbench**: Chat with the agent and view the real-time "Chain of Thought" (Timeline).
- **Knowledge Base**: Inspect the loaded Excel rules and intents.
- **Logs**: All interactions are saved to `car_bot.db`.
