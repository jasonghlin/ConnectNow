# sudo vim /etc/systemd/system/docker-compose@.service
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