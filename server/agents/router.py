import json
from typing import List, Dict
from .base import BaseAgent

class RouterAgent(BaseAgent):
    MODULES = {
        "AC": ["空调", "温度", "制冷", "制热", "风量", "除霜", "除雾", "暖风", "冷风"],
        "NAV": ["导航", "路线", "目的地", "去", "怎么走", "地图", "位置"],
        "MEDIA": ["音乐", "播放", "歌曲", "电台", "音量", "暂停", "下一首", "上一首"],
        "SEAT": ["座椅", "加热", "通风", "按摩", "调节"],
        "WINDOW": ["车窗", "天窗", "玻璃", "窗户"],
        "LIGHT": ["灯", "近光", "远光", "氛围灯", "大灯", "雾灯"]
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是多指令识别器。将用户输入拆分成多条独立指令，并识别每条指令所属的模块。

可用模块及关键词:
{json.dumps(self.MODULES, ensure_ascii=False, indent=2)}

规则:
1. 将复合指令拆分成独立的单条指令
2. 每条指令识别对应的模块
3. 保持原始表达，不要修改用户的说法

输出JSON数组格式:
[
  {{"index": 1, "module": "模块代码", "text": "指令原文", "confidence": 0.0-1.0}},
  ...
]

示例:
输入: "开空调，温度26度，然后导航去公司"
输出: [
  {{"index": 1, "module": "AC", "text": "开空调", "confidence": 0.95}},
  {{"index": 2, "module": "AC", "text": "温度26度", "confidence": 0.92}},
  {{"index": 3, "module": "NAV", "text": "导航去公司", "confidence": 0.98}}
]

只输出JSON数组，不要其他内容。"""

    def recognize(self, message: str) -> List[Dict]:
        result = self.call_llm(message)
        return self.parse_json(result)
