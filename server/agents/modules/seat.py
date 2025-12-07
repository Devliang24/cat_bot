import json
from typing import Dict
from ..base import BaseAgent

class SeatAgent(BaseAgent):
    INTENTS = {
        "打开座椅加热": {"action": "SEAT_HEAT_ON", "params": ["position"]},
        "关闭座椅加热": {"action": "SEAT_HEAT_OFF", "params": ["position"]},
        "座椅加热档位": {"action": "SEAT_HEAT_LEVEL", "params": ["position", "level"]},
        "打开座椅通风": {"action": "SEAT_VENT_ON", "params": ["position"]},
        "关闭座椅通风": {"action": "SEAT_VENT_OFF", "params": ["position"]},
        "座椅通风档位": {"action": "SEAT_VENT_LEVEL", "params": ["position", "level"]},
        "座椅通风增大": {"action": "SEAT_VENT_UP", "params": ["position"]},
        "座椅通风减小": {"action": "SEAT_VENT_DOWN", "params": ["position"]},
        "座椅通风最大": {"action": "SEAT_VENT_MAX", "params": ["position"]},
        "座椅通风最小": {"action": "SEAT_VENT_MIN", "params": ["position"]},
        "打开座椅按摩": {"action": "SEAT_MASSAGE_ON", "params": ["position"]},
        "关闭座椅按摩": {"action": "SEAT_MASSAGE_OFF", "params": ["position"]},
        "调节座椅": {"action": "SEAT_ADJUST", "params": ["position", "direction"]},
        "调高座椅温度": {"action": "SEAT_TEMP_UP", "params": ["position"]},
        "调低座椅温度": {"action": "SEAT_TEMP_DOWN", "params": ["position"]},
        "打开方向盘加热": {"action": "WHEEL_HEAT_ON", "params": []},
        "关闭方向盘加热": {"action": "WHEEL_HEAT_OFF", "params": []}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是座椅控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

位置参数(position): 主驾/副驾/后排左/后排右/全部
方向参数(direction): 前/后/上/下

规则:
1. 识别用户意图
2. 提取座椅位置，默认为"主驾"
3. 如果涉及调节，提取方向

输出JSON格式:
{{"intent": "意图名称", "params": {{"position": "位置"}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
