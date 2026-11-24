# Production Deployment Guide

## Trasol SupportFlow 360 (SupportDesk 360)

---

## 1. Deployment Topology & Overview

**Trasol SupportFlow 360** supports two primary production deployment patterns:
1. **Containerized Deployment (Recommended)**: Multi-container orchestration using **Docker Compose** with Nginx, FastAPI, PostgreSQL 16 Alpine, and Redis 7 Alpine.
2. **Native Linux Systemd Deployment**: Bare-metal or VM installation with Uvicorn systemd services and Nginx reverse proxy.

```mermaid
graph TD
    subgraph External["External Network"]
        INTERNET["Internet Traffic"]
        BREVO["Brevo Cloud API<br/>(HTTPS 443)"]
    end

    subgraph Host["Production Host / Cloud VM"]
        subgraph Edge["Reverse Proxy Tier"]
            NGX["Nginx Web Server<br/>(Ports 80 & 443 SSL)"]
        end

        subgraph Containers["Application Tier (Docker / Systemd)"]
            FROT["Frontend Static Container<br/>(Vite HTML/JS Assets)"]
            BACK["Backend Container<br/>(FastAPI / Uvicorn Workers)"]
            REDIS["Redis 7 Container<br/>(Port 6379 Pub/Sub)"]
            POSTGRES["PostgreSQL 16 Container<br/>(Port 5432 Persistent Data)"]
        end

        subgraph Storage["Named Volumes"]
            V_DB[("postgres_data")]
            V_RED[("redis_data")]
            V_UPL[("backend_uploads")]
        end
    end

    INTERNET -->|HTTPS| NGX
    NGX -->|Serve Static| FROT
    NGX -->|Proxy /api & /ws| BACK
    BACK <--> REDIS
    BACK <--> POSTGRES
    BACK -->|Dispatch OTP| BREVO
    POSTGRES --> V_DB
    REDIS --> V_RED
    BACK --> V_UPL
```

![Deployment Architecture](images/deployment-architecture.svg)

---

## 2. Option 1: Docker Compose Multi-Container Deployment

### 2.1 Prerequisites
* Docker Engine 24.0+
* Docker Compose v2.20+
* Minimum system specs: 2 vCPUs, 4 GB RAM, 20 GB SSD storage.

### 2.2 Configuration
1. Clone the repository:
   ```bash
   git clone https://github.com/Asarafhack/trasol-supportflow.git
   cd trasol-supportflow
   ```
2. Configure production environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set secure credentials:
   ```env
   PROJECT_NAME="Trasol SupportDesk 360"
   COMPANY_NAME="Trasol Technologies"
   FRONTEND_URL="https://support.trasol.tech"
   BACKEND_URL="https://support.trasol.tech"
   SECRET_KEY="generate-a-strong-64-character-random-hex-string"
   DATABASE_URL="postgresql://trasol_admin:StrongPassword2026!@postgres:5432/trasol_supportdesk"
   BREVO_API_KEY="xkeysib-your-production-brevo-api-key"
   MAIL_FROM="support@trasol.tech"
   MAIL_FROM_NAME="Trasol SupportDesk"
   ADMIN_NOTIFICATION_EMAIL="owner@trasol.tech"
   ENABLE_EMAIL_SIMULATION=false
   ```

3. Review [docker-compose.yml](../docker-compose.yml):
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       restart: always
       environment:
         POSTGRES_USER: trasol_admin
         POSTGRES_PASSWORD: StrongPassword2026!
         POSTGRES_DB: trasol_supportdesk
       volumes:
         - postgres_data:/var/lib/postgresql/data
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U trasol_admin -d trasol_supportdesk"]
         interval: 5s
         timeout: 5s
         retries: 5

     redis:
       image: redis:7-alpine
       restart: always
       volumes:
         - redis_data:/data

     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       restart: always
       depends_on:
         postgres:
           condition: service_healthy
         redis:
           condition: service_healthy
       ports:
         - "8000:8000"

     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile
       restart: always
       depends_on:
         - backend
       ports:
         - "80:80"
   ```

### 2.3 Build & Launch Stack
```bash
docker-compose up -d --build
```

### 2.4 Seed Initial Production Data (First-Time Run)
```bash
docker-compose exec backend python app/seed.py
```

### 2.5 Health Check Verification
```bash
curl -f http://localhost:8000/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "Trasol SupportDesk 360",
  "company": "Trasol Technologies",
  "database": "connected",
  "email_provider": "brevo"
}
```

---

## 3. Option 2: Native Linux Systemd Deployment (Ubuntu / Debian)

### 3.1 Install System Dependencies
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip nodejs npm postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx
```

### 3.2 Database Setup (PostgreSQL 16)
```bash
sudo -u postgres psql -c "CREATE USER trasol_admin WITH PASSWORD 'StrongPassword2026!';"
sudo -u postgres psql -c "CREATE DATABASE trasol_supportdesk OWNER trasol_admin;"
```

### 3.3 Backend Virtual Environment Setup
```bash
cd /var/www/trasol-supportflow/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python app/seed.py
```

### 3.4 Create Systemd Service for FastAPI
Create `/etc/systemd/system/trasol-backend.service`:
```ini
[Unit]
Description=Trasol SupportFlow 360 FastAPI Backend
After=network.target postgresql.service redis.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/trasol-supportflow/backend
EnvironmentFile=/var/www/trasol-supportflow/backend/.env
ExecStart=/var/www/trasol-supportflow/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable trasol-backend
sudo systemctl start trasol-backend
```

### 3.5 Frontend Build
```bash
cd /var/www/trasol-supportflow/frontend
npm ci
npm run build
# Built files located in /var/www/trasol-supportflow/frontend/dist
```

### 3.6 Nginx Configuration
Create `/etc/nginx/sites-available/trasol-supportflow`:
```nginx
server {
    listen 80;
    server_name support.trasol.tech;

    root /var/www/trasol-supportflow/frontend/dist;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }
}
```
Enable the site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/trasol-supportflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.7 SSL/TLS Configuration with Let's Encrypt
```bash
sudo certbot --nginx -d support.trasol.tech
```

---

## 4. Backup & Disaster Recovery

### 4.1 PostgreSQL Backup (Automated Cron Job)
```bash
# Nightly backup script
pg_dump -U trasol_admin -h localhost trasol_supportdesk | gzip > /backups/trasol_supportdesk_$(date +\%Y\%m\%d).sql.gz
```

### 4.2 SQLite Local Backup (Development/Staging)
```bash
# Safe backup without write blocking
sqlite3 trasol_supportdesk.db ".backup trasol_supportdesk_backup.db"
```
