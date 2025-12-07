import json
from typing import Dict
from ..base import BaseAgent

class WindowAgent(BaseAgent):
    INTENTS = {
        "打开车窗": {"action": "WINDOW_OPEN", "params": ["position"]},
        "关闭车窗": {"action": "WINDOW_CLOSE", "params": ["position"]},
        "打开天窗": {"action": "SUNROOF_OPEN", "params": []},
        "关闭天窗": {"action": "SUNROOF_CLOSE", "params": []},
        "车窗升起": {"action": "WINDOW_UP", "params": ["position"]},
        "车窗降下": {"action": "WINDOW_DOWN", "params": ["position"]}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是车窗控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

位置参数(position): 主驾/副驾/后排左/后排右/全部

规则:
1. 识别用户意图
2. 提取车窗位置，默认为"全部"

输出JSON格式:
{{"intent": "意图名称", "params": {{"position": "位置"}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
