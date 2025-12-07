import json
from abc import ABC, abstractmethod
from dashscope import Generation

class BaseAgent(ABC):
    def __init__(self, model: str = "qwen-max"):
        self.model = model
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        pass
    
    def call_llm(self, user_input: str, system_prompt: str = None) -> str:
        if system_prompt is None:
            system_prompt = self.get_system_prompt()
        
        response = Generation.call(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
            ],
            result_format="message"
        )
        return response.output.choices[0].message.content
    
    def parse_json(self, text: str) -> dict:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
