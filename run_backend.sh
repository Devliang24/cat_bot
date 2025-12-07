#!/bin/bash
cd "$(dirname "$0")/server"

# Set your DashScope API key here or export it in your shell
if [ -z "$DASHSCOPE_API_KEY" ]; then
    echo "Error: DASHSCOPE_API_KEY is not set"
    echo "Please run: export DASHSCOPE_API_KEY='your-api-key'"
    exit 1
fi

source ../.venv/bin/activate
uvicorn main_v2:app --reload --host 0.0.0.0 --port 8000
