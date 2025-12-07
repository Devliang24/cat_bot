from typing import Dict, Any
from .state import AgentState
from ..agents import RouterAgent, ExecutorAgent, SummarizerAgent
from ..agents.modules import ACAgent, NavAgent, MediaAgent, SeatAgent, WindowAgent, LightAgent

# 初始化 Agents
router_agent = RouterAgent()
executor_agent = ExecutorAgent()
summarizer_agent = SummarizerAgent()

module_agents = {
    "AC": ACAgent(),
    "NAV": NavAgent(),
    "MEDIA": MediaAgent(),
    "SEAT": SeatAgent(),
    "WINDOW": WindowAgent(),
    "LIGHT": LightAgent()
}

def split_node(state: AgentState) -> AgentState:
    """拆分多指令"""
    commands = router_agent.recognize(state["message"])
    state["commands"] = commands
    state["results"] = []
    state["current_index"] = 0
    return state

def process_node(state: AgentState) -> AgentState:
    """处理单条指令"""
    idx = state["current_index"]
    cmd = state["commands"][idx]
    
    module = cmd["module"]
    text = cmd["text"]
    
    # 调用对应模块Agent解析意图
    agent = module_agents.get(module)
    if agent:
        parsed = agent.parse(text)
        intent = parsed.get("intent", "未知")
        params = parsed.get("params", {})
    else:
        intent = "未知"
        params = {}
    
    # 调用执行器生成动作和回复
    result = executor_agent.execute(module, intent, params)
    
    state["results"].append({
        "index": cmd["index"],
        "module": module,
        "intent": intent,
        "params": params,
        "action": result.get("action", "UNKNOWN"),
        "reply": result.get("reply", "操作完成")
    })
    state["current_index"] += 1
    return state

def should_continue(state: AgentState) -> str:
    """判断是否继续处理"""
    if state["current_index"] < len(state["commands"]):
        return "process"
    return "summarize"

def summarize_node(state: AgentState) -> AgentState:
    """合并回复"""
    state["summary"] = summarizer_agent.summarize(state["results"])
    return state
