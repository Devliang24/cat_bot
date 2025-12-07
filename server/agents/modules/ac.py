import json
from typing import Dict
from ..base import BaseAgent

class ACAgent(BaseAgent):
    INTENTS = {
        "打开空调": {"action": "AC_ON", "params": []},
        "关闭空调": {"action": "AC_OFF", "params": []},
        "打开AC": {"action": "AC_ON", "params": []},
        "关闭AC": {"action": "AC_OFF", "params": []},
        "设置温度": {"action": "TEMP_SET", "params": ["temperature"]},
        "升温": {"action": "TEMP_UP", "params": []},
        "降温": {"action": "TEMP_DOWN", "params": []},
        "降到最低": {"action": "TEMP_MIN", "params": []},
        "升到最高": {"action": "TEMP_MAX", "params": []},
        "调高风量": {"action": "FAN_UP", "params": []},
        "调低风量": {"action": "FAN_DOWN", "params": []},
        "设置风量": {"action": "FAN_SET", "params": ["level"]},
        "打开风扇": {"action": "FAN_ON", "params": []},
        "关闭风扇": {"action": "FAN_OFF", "params": []},
        "打开制冷": {"action": "AC_COOL", "params": []},
        "关闭制冷": {"action": "AC_COOL_OFF", "params": []},
        "打开制热": {"action": "AC_HEAT", "params": []},
        "关闭制热": {"action": "AC_HEAT_OFF", "params": []},
        "打开除霜": {"action": "DEFROST_ON", "params": []},
        "关闭除霜": {"action": "DEFROST_OFF", "params": []},
        "打开前除霜": {"action": "DEFROST_FRONT_ON", "params": []},
        "关闭前除霜": {"action": "DEFROST_FRONT_OFF", "params": []},
        "打开后除霜": {"action": "DEFROST_REAR_ON", "params": []},
        "关闭后除霜": {"action": "DEFROST_REAR_OFF", "params": []},
        "打开最大除霜": {"action": "DEFROST_MAX_ON", "params": []},
        "关闭最大除霜": {"action": "DEFROST_MAX_OFF", "params": []},
        "打开除雾": {"action": "DEMIST_ON", "params": []},
        "关闭除雾": {"action": "DEMIST_OFF", "params": []},
        "打开外循环": {"action": "AC_OUTER", "params": []},
        "关闭外循环": {"action": "AC_OUTER_OFF", "params": []},
        "打开内循环": {"action": "AC_INNER", "params": []},
        "关闭内循环": {"action": "AC_INNER_OFF", "params": []},
        "自动空调": {"action": "AC_AUTO", "params": []},
        "关闭自动空调": {"action": "AC_AUTO_OFF", "params": []},
        "打开分区": {"action": "AC_ZONE_ON", "params": []},
        "关闭分区": {"action": "AC_ZONE_OFF", "params": []},
        "切换吹风模式": {"action": "AC_BLOW_MODE", "params": []},
        "吹面": {"action": "AC_BLOW_FACE", "params": []},
        "吹足": {"action": "AC_BLOW_FOOT", "params": []},
        "吹面吹足": {"action": "AC_BLOW_BOTH", "params": []}
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

输入: "外循环"
输出: {{"intent": "打开外循环", "params": {{}}}}

输入: "开内循环"
输出: {{"intent": "打开内循环", "params": {{}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
