FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
# RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
