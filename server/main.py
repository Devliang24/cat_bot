import os
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from server.database import SessionLocal, init_db, ChatLog
from server.agent import CarAgent

# Initialize DB
init_db()

app = FastAPI(title="Qwen Car Agent API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependencies
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Agent Instance
agent = CarAgent()

# Pydantic Models
class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    reply: str
    action: Optional[Dict] = None
    trace: Optional[Dict] = None
    log_id: int

# Routes
@app.get("/")
def read_root():
    return {"status": "ok", "service": "Qwen Car Agent"}

@app.get("/knowledge")
def get_knowledge_base():
    """Return the loaded knowledge base JSON for frontend display."""
    return agent.knowledge_base

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, db: Session = Depends(get_db)):
    # Call Agent
    result = agent.chat(req.message, req.history)
    
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    
    response_data = result.get("response", {})
    trace_data = result.get("trace", {})
    
    # Save Log
    db_log = ChatLog(
        user_input=req.message,
        intent_detected=response_data.get("intent", "UNKNOWN"),
        rules_matched=[], # Placeholder if we implement precise rule matching later
        full_prompt=trace_data.get("full_prompt", ""),
        raw_response=trace_data.get("raw_response", ""),
        parsed_action=response_data.get("action", "NONE"),
        agent_reply=response_data.get("reply", ""),
        latency_ms=int(trace_data.get("latency_ms", 0)),
        token_usage=trace_data.get("token_usage", {})
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Handle action - convert string "NONE" to None
    action_val = response_data.get("action")
    if isinstance(action_val, str):
        action_val = None if action_val == "NONE" else {"action": action_val}
    
    return {
        "reply": response_data.get("reply", "Error processing response"),
        "action": action_val,
        "trace": trace_data,
        "log_id": db_log.id
    }

@app.get("/logs")
def get_logs(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    logs = db.query(ChatLog).order_by(ChatLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
