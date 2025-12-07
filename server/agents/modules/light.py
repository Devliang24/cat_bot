import json
from typing import Dict
from ..base import BaseAgent

class LightAgent(BaseAgent):
    INTENTS = {
        "打开车灯": {"action": "LIGHT_ON", "params": []},
        "关闭车灯": {"action": "LIGHT_OFF", "params": []},
        "打开近光灯": {"action": "LIGHT_LOW", "params": []},
        "打开远光灯": {"action": "LIGHT_HIGH", "params": []},
        "打开雾灯": {"action": "FOG_LIGHT_ON", "params": []},
        "关闭雾灯": {"action": "FOG_LIGHT_OFF", "params": []},
        "打开氛围灯": {"action": "AMBIENT_ON", "params": ["color"]},
        "关闭氛围灯": {"action": "AMBIENT_OFF", "params": []},
        "调节氛围灯": {"action": "AMBIENT_SET", "params": ["color", "brightness"]}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是灯光控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

颜色参数(color): 红/蓝/绿/白/紫/橙/暖白
亮度参数(brightness): 1-10

规则:
1. 识别用户意图
2. 如果涉及氛围灯颜色，提取color参数
3. 如果涉及亮度，提取brightness参数

输出JSON格式:
{{"intent": "意图名称", "params": {{}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
