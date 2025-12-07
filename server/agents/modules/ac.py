import json
from typing import Dict
from ..base import BaseAgent

class ACAgent(BaseAgent):
    INTENTS = {
        "打开空调": {"action": "AC_ON", "params": []},
        "关闭空调": {"action": "AC_OFF", "params": []},
        "设置温度": {"action": "TEMP_SET", "params": ["temperature"]},
        "升温": {"action": "TEMP_UP", "params": []},
        "降温": {"action": "TEMP_DOWN", "params": []},
        "调高风量": {"action": "FAN_UP", "params": []},
        "调低风量": {"action": "FAN_DOWN", "params": []},
        "打开制冷": {"action": "AC_COOL", "params": []},
        "打开制热": {"action": "AC_HEAT", "params": []},
        "打开除霜": {"action": "DEFROST_ON", "params": []},
        "关闭除霜": {"action": "DEFROST_OFF", "params": []},
        "打开除雾": {"action": "DEMIST_ON", "params": []},
        "关闭除雾": {"action": "DEMIST_OFF", "params": []}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是空调控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

规则:
1. 识别用户意图
2. 如果涉及温度设置，提取temperature参数(数字)
3. 如果涉及风量设置，提取fan_level参数(1-7)

输出JSON格式:
{{"intent": "意图名称", "params": {{"参数名": "值"}}}}

示例:
输入: "温度调到26度"
输出: {{"intent": "设置温度", "params": {{"temperature": 26}}}}

输入: "开空调"
输出: {{"intent": "打开空调", "params": {{}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
