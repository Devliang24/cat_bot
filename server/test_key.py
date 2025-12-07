import dashscope
import os
from dashscope import Generation

def test_api():
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        print("Error: DASHSCOPE_API_KEY not found.")
        return

    print(f"Testing API Key: {api_key[:5]}...{api_key[-4:]}")
    dashscope.api_key = api_key
    
    try:
        messages = [{'role': 'system', 'content': 'You are a helpful assistant.'},
                    {'role': 'user', 'content': 'Say hello!'}]
        
        response = Generation.call(
            model="qwen-turbo",
            messages=messages,
            result_format='message'
        )
        
        if response.status_code == 200:
            print("Success! Response:")
            print(response.output.choices[0].message.content)
        else:
            print(f"Failed. Code: {response.code}, Message: {response.message}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_api()
