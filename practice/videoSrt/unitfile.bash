# sudo vim /etc/systemd/system/docker-compose@.service
# sudo systemctl restart docker-compose@convert_video_service
# sudo systemctl restart docker-compose@video_srt_service
# https://pytorch.org/get-started/locally/#linux-pip
# https://medium.com/@solanki.kishan007/docker-how-to-use-nvidia-gpu-in-docker-ubuntu-57353894c3af
[Unit]
Description=%i service with docker compose
Requires=docker.service
After=docker.service

[Service]
WorkingDirectory=/home/ubuntu/ConnectNow/practice/videoSrt
ExecStart=/usr/bin/docker compose -f /home/ubuntu/ConnectNow/practice/videoSrt/docker-compose.yml up %i
ExecStop=/usr/bin/docker compose -f /home/ubuntu/ConnectNow/practice/videoSrt/docker-compose.yml down
ExecReload=/usr/bin/docker compose -f /home/ubuntu/ConnectNow/practice/videoSrt/docker-compose.yml restart %i
TimeoutStartSec=0
RestartSec=5s

[Install]
WantedBy=multi-user.target