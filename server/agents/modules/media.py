import json
from typing import Dict
from ..base import BaseAgent

class MediaAgent(BaseAgent):
    INTENTS = {
        "播放音乐": {"action": "MEDIA_PLAY", "params": []},
        "暂停播放": {"action": "MEDIA_PAUSE", "params": []},
        "下一首": {"action": "MEDIA_NEXT", "params": []},
        "上一首": {"action": "MEDIA_PREV", "params": []},
        "调高音量": {"action": "VOL_UP", "params": []},
        "调低音量": {"action": "VOL_DOWN", "params": []},
        "设置音量": {"action": "VOL_SET", "params": ["volume"]},
        "播放歌曲": {"action": "MEDIA_PLAY_SONG", "params": ["song_name"]},
        "播放歌手": {"action": "MEDIA_PLAY_ARTIST", "params": ["artist_name"]},
        "打开电台": {"action": "RADIO_ON", "params": []},
        "关闭电台": {"action": "RADIO_OFF", "params": []}
    }
    
    def get_system_prompt(self) -> str:
        return f"""你是媒体控制意图解析器。解析用户指令并提取参数。

支持的意图:
{json.dumps(self.INTENTS, ensure_ascii=False, indent=2)}

规则:
1. 识别用户意图
2. 如果涉及歌曲名，提取song_name参数
3. 如果涉及歌手名，提取artist_name参数
4. 如果涉及音量设置，提取volume参数(0-100)

输出JSON格式:
{{"intent": "意图名称", "params": {{"参数名": "值"}}}}

只输出JSON，不要其他内容。"""

    def parse(self, text: str) -> Dict:
        result = self.call_llm(text)
        return self.parse_json(result)
