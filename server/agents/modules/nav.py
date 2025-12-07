import json
from typing import Dict
from ..base import BaseAgent

class NavAgent(BaseAgent):
    INTENTS = {
        "导航到目的地": {"action": "NAV_TO", "params": ["destination"]},
        "导航回家": {"action": "NAV_HOME", "params": []},
        "导航去公司": {"action": "NAV_COMPANY", "params": []},
        "搜索地点": {"action": "NAV_SEARCH", "params": ["keyword"]},
        "停止导航": {"action": "NAV_STOP", "params": []},
        "查看路况": {"action": "NAV_TRAFFIC", "params": []},
        "切换路线": {"action": "NAV_REROUTE", "params": []}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是导航控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

规则:
1. 识别用户意图
2. 如果涉及目的地，提取destination参数
3. 如果涉及搜索，提取keyword参数

输出JSON格式:
{{"intent": "意图名称", "params": {{"参数名": "值"}}}}

示例:
输入: "导航去公司"
输出: {{"intent": "导航去公司", "params": {{}}}}

输入: "导航到上海虹桥机场"
输出: {{"intent": "导航到目的地", "params": {{"destination": "上海虹桥机场"}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
