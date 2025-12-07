from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import split_node, process_node, should_continue, summarize_node

def create_workflow():
    """创建 LangGraph 工作流"""
    graph = StateGraph(AgentState)
    
    # 添加节点
    graph.add_node("split", split_node)
    graph.add_node("process", process_node)
    graph.add_node("summarize", summarize_node)
    
    # 设置入口
    graph.set_entry_point("split")
    
    # 添加条件边
    graph.add_conditional_edges(
        "split",
        should_continue,
        {"process": "process", "summarize": "summarize"}
    )
    graph.add_conditional_edges(
        "process",
        should_continue,
        {"process": "process", "summarize": "summarize"}
    )
    
    # 结束
    graph.add_edge("summarize", END)
    
    return graph.compile()

# 编译工作流
workflow = create_workflow()
