#!/bin/bash

# 記錄開始執行
echo "開始執行 user data 腳本" >> /var/log/user-data.log

# 更新系統
apt update && apt upgrade -y || { echo "系統更新失敗" >> /var/log/user-data.log; exit 1; }

# 安裝必要的包
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 添加 Docker 的源到 Apt 資源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安裝 Docker 和 docker-compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo apt install -y docker-compose

# 克隆專案
su - ubuntu -c "git clone https://github.com/jasonghlin/ConnectNow.git" || { 
    echo "克隆專案失敗，嘗試清理並重新克隆" >> /var/log/user-data.log
    rm -rf /home/ubuntu/ConnectNow
    su - ubuntu -c "git clone https://github.com/jasonghlin/ConnectNow.git"
} || { echo "克隆專案最終失敗" >> /var/log/user-data.log; exit 1; }

# 創建專案目錄並設置正確的權限
sudo chown -R ubuntu:ubuntu /home/ubuntu/ConnectNow
sudo chmod -R 755 /home/ubuntu/ConnectNow

# 啟動 docker-compose
sudo docker compose -f /home/ubuntu/ConnectNow/practice/peer-server/docker-compose.yml up --build
