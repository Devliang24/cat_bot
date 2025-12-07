from typing import List, Dict
from .base import BaseAgent

class SummarizerAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return """将多条执行结果合并成一句自然流畅的语音回复。

要求:
1. 简洁自然，适合语音播报
2. 将多个操作合并成一句话
3. 不要逐条列举，要有连贯性
4. 控制在30字以内

示例:
输入回复列表: ["已打开空调", "温度已调至26度", "正在为您导航到公司"]
输出: "好的，已打开空调并调至26度，正在导航到公司"

只输出合并后的回复文本，不要其他内容。"""

    def summarize(self, results: List[Dict]) -> str:
        if not results:
            return "操作完成"
        
        if len(results) == 1:
            return results[0].get("reply", "操作完成")
        
        replies = [r.get("reply", "") for r in results]
        prompt = f"请合并以下回复: {replies}"
        return self.call_llm(prompt).strip('"').strip("'")
