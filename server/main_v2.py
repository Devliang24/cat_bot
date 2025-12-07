import os
import time
import json
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import io

from graph.workflow import workflow
from graph.nodes import router_agent, module_agents, executor_agent, summarizer_agent
from database import SessionLocal, ChatLog

app = FastAPI(title="Car Agent API v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class RecognizeRequest(BaseModel):
    message: str

class CommandItem(BaseModel):
    module: str
    text: str

class ExecuteRequest(BaseModel):
    commands: List[CommandItem]

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []

# Response Models
class CommandResponse(BaseModel):
    index: int
    module: str
    text: str
    confidence: float

class ResultResponse(BaseModel):
    index: int
    module: str
    intent: str
    params: dict
    action: str
    reply: str

@app.get("/")
async def root():
    return {"message": "Car Agent API v2", "version": "2.0.0"}

@app.post("/chat/recognize")
async def recognize(req: RecognizeRequest):
    """阶段1: 模块识别（返回数组）"""
    try:
        start_time = time.time()
        commands = router_agent.recognize(req.message)
        latency = int((time.time() - start_time) * 1000)
        
        return {
            "commands": commands,
            "latency_ms": latency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/execute")
async def execute(req: ExecuteRequest):
    """阶段2: 执行命令（返回数组）"""
    try:
        start_time = time.time()
        results = []
        
        for i, cmd in enumerate(req.commands):
            agent = module_agents.get(cmd.module)
            if agent:
                parsed = agent.parse(cmd.text)
                intent = parsed.get("intent", "未知")
                params = parsed.get("params", {})
            else:
                intent = "未知"
                params = {}
            
            result = executor_agent.execute(cmd.module, intent, params)
            
            results.append({
                "index": i + 1,
                "module": cmd.module,
                "intent": intent,
                "params": params,
                "action": result.get("action", "UNKNOWN"),
                "reply": result.get("reply", "操作完成")
            })
        
        summary = summarizer_agent.summarize(results)
        latency = int((time.time() - start_time) * 1000)
        
        return {
            "results": results,
            "summary": summary,
            "latency_ms": latency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(req: ChatRequest):
    """完整流程（兼容旧版 + 新功能）"""
    from agents.base import BaseAgent
    try:
        start_time = time.time()
        BaseAgent.reset_tokens()  # 重置 token 计数
        
        # 使用 LangGraph 工作流
        state = {
            "message": req.message,
            "commands": [],
            "results": [],
            "summary": "",
            "current_index": 0
        }
        
        result = workflow.invoke(state)
        latency = int((time.time() - start_time) * 1000)
        token_usage = BaseAgent.get_tokens()
        
        # 保存日志
        db = SessionLocal()
        try:
            import json as json_lib
            result_with_tokens = {**result, "token_usage": token_usage}
            log = ChatLog(
                user_input=req.message,
                intent_detected=",".join([r["intent"] for r in result["results"]]),
                full_prompt="Multi-agent workflow",
                raw_response=json_lib.dumps(result_with_tokens, ensure_ascii=False),
                parsed_action=json_lib.dumps([r["action"] for r in result["results"]], ensure_ascii=False),
                latency_ms=latency,
                token_usage=json_lib.dumps(token_usage)
            )
            db.add(log)
            db.commit()
            log_id = log.id
        finally:
            db.close()
        
        return {
            "commands": result["commands"],
            "results": result["results"],
            "summary": result["summary"],
            "reply": result["summary"],  # 兼容旧版
            "latency_ms": latency,
            "token_usage": token_usage,
            "log_id": log_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/knowledge")
async def get_knowledge():
    """获取当前激活的知识库"""
    kb_path = "data/knowledge_base.json"
    if os.path.exists(kb_path):
        with open(kb_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"rules": [], "intents": []}

# ========== Knowledge Base File Management ==========

DATA_DIR = "data"
UPLOADS_DIR = "data/uploads"
KB_FILE = "data/knowledge_base.json"
KB_DEFAULT = "data/knowledge_base.default.json"

def clean_text(text):
    if pd.isna(text):
        return ""
    return str(text).strip()

def extract_intents_from_excel(xls):
    """Extract intents from Vehicle Query sheet with deduplication."""
    intents = []
    seen_intents = set()
    duplicates = 0
    try:
        df = pd.read_excel(xls, sheet_name='Vehicle Query')
        df.columns = [str(c).strip() for c in df.columns]
        
        last_ability = ''
        last_feature = ''
        last_intent = ''
        
        for _, row in df.iterrows():
            ability = clean_text(row.get('Ability', ''))
            feature = clean_text(row.get('Feature', ''))
            intent = clean_text(row.get('Intent', ''))
            query = clean_text(row.get('Query', ''))
            
            if ability:
                last_ability = ability
            if feature:
                last_feature = feature
            if intent:
                last_intent = intent
            
            if query and last_intent:
                if last_intent not in seen_intents:
                    seen_intents.add(last_intent)
                    intents.append({
                        "domain": "Vehicle",
                        "ability": last_ability,
                        "feature": last_feature,
                        "intent": last_intent,
                        "query": query
                    })
                else:
                    duplicates += 1
    except Exception:
        pass
    return intents, duplicates

@app.get("/knowledge/files")
async def list_knowledge_files():
    """List all knowledge base files."""
    files = []
    
    # System default
    if os.path.exists(KB_DEFAULT):
        with open(KB_DEFAULT, "r", encoding="utf-8") as f:
            data = json.load(f)
        files.append({
            "id": "default",
            "name": "knowledge_base.default",
            "source": "System",
            "rules": len(data.get("rules", [])),
            "intents": len(data.get("intents", [])),
            "active": not os.path.exists(f"{UPLOADS_DIR}/active.txt")
        })
    
    # User uploads
    if os.path.exists(UPLOADS_DIR):
        active_file = None
        if os.path.exists(f"{UPLOADS_DIR}/active.txt"):
            with open(f"{UPLOADS_DIR}/active.txt", "r") as f:
                active_file = f.read().strip()
        
        for fname in os.listdir(UPLOADS_DIR):
            if fname.endswith(".json") and fname != "active.txt":
                fpath = os.path.join(UPLOADS_DIR, fname)
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                files.append({
                    "id": fname.replace(".json", ""),
                    "name": fname.replace(".json", ""),
                    "source": "Import",
                    "rules": len(data.get("rules", [])),
                    "intents": len(data.get("intents", [])),
                    "active": fname == active_file
                })
    
    return files

@app.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    """Upload Excel knowledge base file."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are supported")
    
    content = await file.read()
    xls = pd.ExcelFile(io.BytesIO(content))
    
    intents, duplicates = extract_intents_from_excel(xls)
    
    if not intents:
        raise HTTPException(400, "No valid intents found. Check Excel format (need 'Vehicle Query' sheet with Ability, Feature, Intent, Query columns)")
    
    kb = {"rules": [], "intents": intents}
    
    # Save to uploads folder
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    base_name = os.path.splitext(file.filename)[0]
    save_path = os.path.join(UPLOADS_DIR, f"{base_name}.json")
    
    # Avoid overwrite
    counter = 1
    while os.path.exists(save_path):
        save_path = os.path.join(UPLOADS_DIR, f"{base_name}_{counter}.json")
        counter += 1
    
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(kb, f, ensure_ascii=False, indent=2)
    
    # Auto activate
    shutil.copy(save_path, KB_FILE)
    with open(f"{UPLOADS_DIR}/active.txt", "w") as f:
        f.write(os.path.basename(save_path))
    
    return {
        "status": "ok",
        "filename": os.path.basename(save_path).replace(".json", ""),
        "intents": len(intents),
        "duplicates_removed": duplicates
    }

@app.post("/knowledge/activate/{file_id}")
async def activate_knowledge(file_id: str):
    """Activate a knowledge base file."""
    if file_id == "default":
        shutil.copy(KB_DEFAULT, KB_FILE)
        if os.path.exists(f"{UPLOADS_DIR}/active.txt"):
            os.remove(f"{UPLOADS_DIR}/active.txt")
    else:
        fpath = os.path.join(UPLOADS_DIR, f"{file_id}.json")
        if not os.path.exists(fpath):
            raise HTTPException(404, "File not found")
        shutil.copy(fpath, KB_FILE)
        with open(f"{UPLOADS_DIR}/active.txt", "w") as f:
            f.write(f"{file_id}.json")
    
    return {"status": "ok", "active": file_id}

@app.delete("/knowledge/files/{file_id}")
async def delete_knowledge_file(file_id: str):
    """Delete an uploaded knowledge base file."""
    if file_id == "default":
        raise HTTPException(400, "Cannot delete system default")
    
    fpath = os.path.join(UPLOADS_DIR, f"{file_id}.json")
    if not os.path.exists(fpath):
        raise HTTPException(404, "File not found")
    
    # Check if active
    active_file = None
    if os.path.exists(f"{UPLOADS_DIR}/active.txt"):
        with open(f"{UPLOADS_DIR}/active.txt", "r") as f:
            active_file = f.read().strip()
    
    if active_file == f"{file_id}.json":
        # Switch to default
        shutil.copy(KB_DEFAULT, KB_FILE)
        os.remove(f"{UPLOADS_DIR}/active.txt")
    
    os.remove(fpath)
    return {"status": "ok"}

@app.get("/knowledge/export")
async def export_knowledge():
    """Export current knowledge base as Excel."""
    if not os.path.exists(KB_FILE):
        raise HTTPException(404, "No knowledge base found")
    
    with open(KB_FILE, "r", encoding="utf-8") as f:
        kb = json.load(f)
    
    # Deduplicate intents
    seen = set()
    unique_intents = []
    for item in kb.get("intents", []):
        if item["intent"] not in seen:
            seen.add(item["intent"])
            unique_intents.append(item)
    
    # Create Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Intents sheet only
        intents_df = pd.DataFrame(unique_intents)
        if not intents_df.empty:
            intents_df = intents_df[['ability', 'feature', 'intent', 'query']]
            intents_df.columns = ['Ability', 'Feature', 'Intent', 'Query']
        intents_df.to_excel(writer, sheet_name='Vehicle Query', index=False)
    
    output.seek(0)
    
    # Save temp file
    temp_path = "/tmp/knowledge_export.xlsx"
    with open(temp_path, "wb") as f:
        f.write(output.read())
    
    return FileResponse(temp_path, filename="knowledge_export.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/knowledge/template")
async def download_template():
    """Download Excel template."""
    template_path = "data/template.xlsx"
    if not os.path.exists(template_path):
        # Create template
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Intents sheet only
            intents_df = pd.DataFrame({
                'Ability': ['AC Control', 'AC Control', 'Window Control'],
                'Feature': ['Power', 'Temperature', 'Open/Close'],
                'Intent': ['turn_on_ac', 'set_temperature', 'open_window'],
                'Query': ['Turn on AC', 'Set to 24 degrees', 'Open the window']
            })
            intents_df.to_excel(writer, sheet_name='Vehicle Query', index=False)
        
        output.seek(0)
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(template_path, "wb") as f:
            f.write(output.read())
    
    return FileResponse(template_path, filename="knowledge_template.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/logs")
async def get_logs(limit: int = 50):
    """获取日志"""
    db = SessionLocal()
    try:
        logs = db.query(ChatLog).order_by(ChatLog.id.desc()).limit(limit).all()
        return [
            {
                "id": log.id,
                "user_input": log.user_input,
                "intent_detected": log.intent_detected,
                "latency_ms": log.latency_ms,
                "raw_response": log.raw_response,
                "timestamp": str(log.timestamp)
            }
            for log in logs
        ]
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
