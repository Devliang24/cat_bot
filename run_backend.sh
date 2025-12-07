#!/bin/bash
cd "$(dirname "$0")/server"
export DASHSCOPE_API_KEY="sk-9c4148a1292c44e6af324763d2b64e62"
source ../.venv/bin/activate
uvicorn main_v2:app --reload --host 0.0.0.0 --port 8000
