import json
import os
import time
import dashscope
from dashscope import Generation
from typing import Dict, Any, List

# Load API Key from env
# DASHSCOPE_API_KEY must be set in environment

class CarAgent:
    def __init__(self, kb_path: str = "server/data/knowledge_base.json"):
        self.kb_path = kb_path
        self.knowledge_base = self._load_kb()
        self.model = "qwen-max" # Default model

    def _load_kb(self) -> Dict:
        if not os.path.exists(self.kb_path):
            print(f"Warning: Knowledge base not found at {self.kb_path}")
            return {}
        with open(self.kb_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _construct_system_prompt(self) -> str:
        """
        Build the system prompt using the knowledge base.
        """
        prompt = """你是一个智能车载语音助手，帮助驾驶员控制车辆、导航和媒体播放。

## 输出格式
你必须以 JSON 格式输出，包含以下字段：
- "action": 动作代码（如 AC_ON, AC_OFF, NAV_TO, MEDIA_PLAY, TEMP_UP, TEMP_DOWN, WINDOW_OPEN 等），无动作时填 "NONE"
- "reply": 语音回复内容（简洁友好）
- "intent": 识别到的意图

## 示例
用户: 打开空调
输出: {"action": "AC_ON", "reply": "好的，已为您打开空调", "intent": "打开空调"}

用户: 导航去公司
输出: {"action": "NAV_TO_COMPANY", "reply": "好的，正在为您导航到公司", "intent": "导航去公司"}

用户: 温度调高一点
输出: {"action": "TEMP_UP", "reply": "好的，已调高温度", "intent": "升温"}

## 注意事项
1. 如果用户请求不在支持范围内，礼貌拒绝
2. 如果不确定用户意图，请询问澄清
3. 回复要简洁，适合语音播报

"""
        # Add Rules
        rules = self.knowledge_base.get("rules", [])
        if rules:
            prompt += "## 导航规则\n"
            for rule in rules:
                prompt += f"- {rule}\n"
            prompt += "\n"
        
        # Add Intents grouped by domain with examples
        intents = self.knowledge_base.get("intents", [])
        if intents:
            # Group by domain
            domains = {}
            for item in intents:
                domain = item.get("domain", "Other")
                if domain not in domains:
                    domains[domain] = []
                domains[domain].append({
                    "intent": item.get("intent", ""),
                    "query": item.get("query", "")
                })
            
            prompt += "## 支持的意图\n"
            for domain, items in domains.items():
                prompt += f"\n### {domain}\n"
                # Show unique intents with one example query
                seen = set()
                count = 0
                for item in items:
                    intent = item["intent"]
                    if intent not in seen and count < 30:
                        seen.add(intent)
                        query = item["query"]
                        if query:
                            prompt += f"- {intent} (示例: {query})\n"
                        else:
                            prompt += f"- {intent}\n"
                        count += 1

        prompt += "\n请严格按 JSON 格式输出。"
        return prompt

    def chat(self, user_input: str, history: List[Dict] = []) -> Dict[str, Any]:
        """
        Process a user message.
        Returns: {
            "reply": str,
            "action": dict,
            "trace": { ... }
        }
        """
        start_time = time.time()
        
        system_prompt = self._construct_system_prompt()
        
        # Build messages for Qwen
        messages = [{'role': 'system', 'content': system_prompt}]
        
        # Add history (last 5 turns to save tokens)
        # Convert 'agent' role to 'assistant' for Qwen API compatibility
        for msg in history[-5:]:
            role = msg.get('role', 'user')
            if role == 'agent':
                role = 'assistant'
            messages.append({'role': role, 'content': msg.get('content', '')})
            
        messages.append({'role': 'user', 'content': user_input})
        
        full_prompt_log = json.dumps(messages, ensure_ascii=False, indent=2)
        
        # Call Qwen
        try:
            response = Generation.call(
                model=self.model,
                messages=messages,
                result_format='message',  # set result format as message
                temperature=0.2 # Low temp for rule following
            )
        except Exception as e:
            return {
                "error": str(e),
                "trace": {
                    "full_prompt": full_prompt_log,
                    "error": str(e)
                }
            }

        latency = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            raw_content = response.output.choices[0].message.content
            # Convert DashScope object to dict for serialization
            token_usage = dict(response.usage) if response.usage else {}
            
            # Parse JSON
            try:
                # Cleaning markdown code blocks if present
                clean_content = raw_content.replace("```json", "").replace("```", "").strip()
                parsed = json.loads(clean_content)
            except:
                # Fallback if not JSON
                parsed = {
                    "action": "NONE",
                    "reply": raw_content,
                    "intent": "UNKNOWN"
                }
            
            return {
                "response": parsed,
                "trace": {
                    "user_input": user_input,
                    "full_prompt": full_prompt_log,
                    "raw_response": raw_content,
                    "latency_ms": latency,
                    "token_usage": token_usage
                }
            }
        else:
            return {
                "error": f"API Error: {response.code} - {response.message}",
                "trace": {
                    "full_prompt": full_prompt_log,
                    "raw_response": str(response),
                    "latency_ms": latency
                }
            }

if __name__ == "__main__":
    # Test
    agent = CarAgent()
    print(agent._construct_system_prompt())
