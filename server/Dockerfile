FROM python:3.9-slim
WORKDIR /app

# Use Tsinghua mirror
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main_v2:app", "--host", "0.0.0.0", "--port", "8000"]
