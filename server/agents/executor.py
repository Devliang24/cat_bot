import json
from typing import Dict, Any
from .base import BaseAgent

class ExecutorAgent(BaseAgent):
    def get_system_prompt(self) -> str:
        return """根据模块、意图和参数，生成执行动作代码和语音回复。

动作代码命名规则:
- 空调: AC_ON, AC_OFF, TEMP_SET_{温度}, TEMP_UP, TEMP_DOWN, FAN_UP, FAN_DOWN, AC_COOL, AC_HEAT, DEFROST_ON, DEFROST_OFF
- 导航: NAV_TO_{目的地}, NAV_HOME, NAV_COMPANY, NAV_SEARCH_{关键词}, NAV_STOP
- 媒体: MEDIA_PLAY, MEDIA_PAUSE, MEDIA_NEXT, MEDIA_PREV, VOL_UP, VOL_DOWN, VOL_SET_{音量}
- 座椅: SEAT_HEAT_ON, SEAT_HEAT_OFF, SEAT_VENT_ON, SEAT_VENT_OFF, SEAT_MASSAGE_ON, SEAT_MASSAGE_OFF
- 车窗: WINDOW_OPEN, WINDOW_CLOSE, SUNROOF_OPEN, SUNROOF_CLOSE
- 灯光: LIGHT_ON, LIGHT_OFF, LIGHT_HIGH, LIGHT_LOW, AMBIENT_ON, AMBIENT_OFF

输出JSON格式:
{
  "action": "动作代码",
  "reply": "语音回复（简洁友好，适合TTS播报）"
}

只输出JSON，不要其他内容。"""

    def execute(self, module: str, intent: str, params: Dict[str, Any]) -> Dict:
        prompt = f"""模块: {module}
意图: {intent}
参数: {json.dumps(params, ensure_ascii=False) if params else "无"}

请生成执行命令和回复。"""
        result = self.call_llm(prompt)
        return self.parse_json(result)
