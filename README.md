# Project Name: Connect Now

[**Connect Now**](https://www.connectnow.website/) is an easy-to-use web-based video conferencing platform designed to facilitate seamless communication and collaboration for multiple participants. This project offers a robust set of features, including:

- Real-time video and audio streaming
- Dynamic room creation
- Screen sharing
- Subtitle generation and transformation
- Interactive tools such as polls, chat, and breakout rooms

![mainVisual](static/images/README/mainVisual.png)
## Table of Contents
- [Project Name: Connect Now](#project-name-connect-now)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Technologies](#technologies)
    - [Back-End](#back-end)
    - [Front-End](#front-end)
    - [Database](#database)
    - [Cloud Service (AWS)](#cloud-service-aws)
    - [Testing \& CI/CD](#testing--cicd)
    - [Other Tools](#other-tools)
  - [Overall System Architechture](#overall-system-architechture)
  - [1. AWS-based Infrastructure](#1-aws-based-infrastructure)
  - [2. Efficient Data Workflows](#2-efficient-data-workflows)
  - [3. Resource Optimization via AWS Lambda](#3-resource-optimization-via-aws-lambda)
  - [4. Horizontal Scalability](#4-horizontal-scalability)
  - [5. Backend and Caching](#5-backend-and-caching)
  - [Getting Started](#getting-started)
    - [Installation](#installation)
  - [Contact](#contact)

---

## Features
- **Real-time Video & Audio**: Smooth video and audio streaming with WebRTC.
- **Dynamic Room Creation**: Instantly create and manage video conferencing rooms.
- **Screen Sharing**: Share screens with participants for enhanced collaboration.
- **Subtitle Generation**: Convert video content into subtitles for accessibility.
- **Interactive Polls and Chat**: Engage participants with polls and a chat system.
- **Breakout Rooms**: Split participants into smaller groups for focused discussions.

## Technologies

### Back-End
- **Node.js**: Server-side JavaScript runtime.
- **Express**: Web framework for building API and handling server logic.
- **Socket.IO**: Real-time bidirectional event-based communication.

### Front-End
- **JavaScript**
- **HTML**
- **WebRTC**: Real-time communication for audio, video, and data sharing.
- **MediaPipe**: Provides background blurring and transformation features.

### Database
- **MySQL**: Relational database for storing user and room data.
- **Redis**: In-memory data structure store, used for managing real-time chat states and caching.

### Cloud Service (AWS)
- **Elastic Compute Cloud (EC2)**: Virtual servers for running the application.
- **Simple Storage Service (S3)**: Storage for video recordings and subtitle files.
- **Relational Database Service (RDS)**: Managed MySQL database for the platform.
- **ElastiCache for Redis**: Caching layer for real-time communication.
- **CloudFront**: Content delivery network (CDN) for fast content distribution.
- **Route 53**: Domain Name System (DNS) web service for routing traffic.
- **Elastic Load Balancer (ELB)**: Distributes incoming traffic across multiple EC2 instances.
- **Auto Scaling**: Automatically adjusts the EC2 instance count to meet traffic demands.

### Testing & CI/CD
- **Jest**: Testing framework for ensuring code functionality.
- **GitHub Actions**: Continuous Integration/Continuous Deployment (CI/CD) pipeline for automated testing and deployment.

### Other Tools
- **Git / GitHub**: Version control and collaboration.
- **MVC Design Pattern**: Follows the Model-View-Controller architecture.
- **ESLint**: Linting tool for maintaining code quality.

---

## Overall System Architechture

![System Architecture](static/images/README/Connect Now architecture.png)

Our system architecture is designed for flexibility, scalability, and efficient resource utilization. It integrates media processing, subtitle generation, and real-time communication using optimized AWS services.

## 1. AWS-based Infrastructure
The architecture leverages key AWS services such as EC2, S3, Lambda, and Elasticache to handle video processing, subtitle generation, and WebRTC-based peer-to-peer communication. These components are deployed in isolated environments using Docker to ensure security, performance, and scalability.

## 2. Efficient Data Workflows
The system handles media processing and communication through streamlined workflows:
  - **Video Transformation**: Video files uploaded to AWS S3 are processed by Lambda functions for format conversions (e.g., using FFmpeg). Once converted, the files are stored back in S3 for user access.
  - **Subtitle Generation**: Whisper, running in Docker containers on EC2 instances, transcribes video audio into subtitles. The generated subtitle files are stored in S3 and linked to the corresponding video.
  - **Real-time Communication**: WebRTC-based peer-to-peer communication is facilitated by PeerJS, with the Node.js backend managing the application logic and service integration. This enables seamless video and audio streaming between users.

## 3. Resource Optimization via AWS Lambda
AWS Lambda is used to optimize resource allocation by controlling EC2 instance lifecycles. EC2 instances are only activated when required for tasks like video processing and are automatically shut down when no jobs are queued (e.g., when no SQS messages are detected). This approach minimizes operational costs while maintaining resource availability during peak usage.

## 4. Horizontal Scalability
The system supports horizontal scaling, allowing additional EC2 instances to be provisioned when media processing demand increases or user traffic is high. This ensures smooth performance, even when many users are using the service simultaneously.

## 5. Backend and Caching
The backend server, built with Node.js, handles user requests, application logic, and session management. Elasticache (Redis) is used to cache real-time data, reducing latency and improving performance during video conferencing and peer-to-peer connections.

---

## Getting Started

You can either visit [www.connectnow.website](https://www.connectnow.website/) to start using ConnectNow services immediately or follow the steps below to set it up locally.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/connectnow.git
   cd ConnectNow
2. Replace the domain name and AWS CloudFront URL with your own in the frontend static JS files.
3. Set up the environment variables for the cloud services and database connections
   ```bash
    MYSQL_USER
    MYSQL_HOST
    MYSQL_PASSWORD
    REDIS_URL
    JWT_SECRET_KEY
    SESSION_KEY
    AWS_ACCESS_KEY
    AWS_SECRET_KEY
    BUCKET_NAME
    ENV
    SQS_URL
    SQS_URL_2
    CDN_URL
    INSTANCE_ID
    GOOGLE_AUTO_CLIENT_ID
    GOOGLE_AUTO_CLIENT_SECRET
    STATIC_FILE_URL
    DOMAIN

4. Start the application using Docker by running the Dockerfile-server, peerjs, and videosrt Docker files located in their respective folders

5. Alternatively, you can install dependencies for the back-end:
   ```bash
   npm install
   npm start
   ```
   Access the web application at http://localhost:8080 or your own domain.

## Contact

Email : m338107001@tmu.edu.tw

Linkedin : https://www.linkedin.com/in/gan-hong-lin-28b861288/

Phone : (+886) 905787809