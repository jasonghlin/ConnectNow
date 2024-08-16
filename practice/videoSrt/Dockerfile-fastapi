# 使用最新的 Python 版本
FROM python:latest

WORKDIR /usr/src/app

# 複製 requirements.txt 來安裝依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製其他文件，並排除 .env 文件
COPY . .
RUN rm -rf .env

# 曝露應用的端口
EXPOSE 8000

# 啟動應用時指定 .env 文件
CMD ["sh", "-c", "uvicorn videoSrt:app --host 0.0.0.0 --port 8000 --reload"]
