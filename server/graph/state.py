from typing import TypedDict, Optional, List, Dict, Any

class Command(TypedDict):
    index: int
    module: str
    text: str
    confidence: float

class Result(TypedDict):
    index: int
    module: str
    intent: str
    params: Dict[str, Any]
    action: str
    reply: str

class AgentState(TypedDict):
    message: str
    commands: List[Command]
    results: List[Result]
    summary: str
    current_index: int
