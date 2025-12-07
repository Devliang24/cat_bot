import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

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
    """获取知识库"""
    import json
    kb_path = "data/knowledge_base.json"
    if os.path.exists(kb_path):
        with open(kb_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"rules": [], "intents": []}

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
