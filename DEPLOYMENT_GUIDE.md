a# SaamPOS - Digital Ocean Deployment Guide

## Overview
This guide walks you through deploying the SaamPOS application (Angular frontend + Spring Boot backend) to a Digital Ocean droplet.

---

## Prerequisites

### What You Need:
- ✅ Digital Ocean account
- ✅ A droplet created (Ubuntu 22.04 LTS recommended)
- ✅ SSH access to your droplet
- ✅ Domain name (optional, for SSL/HTTPS)
- ✅ Your local code ready to deploy

### Recommended Droplet Specs:
- **Basic Plan:** 2 GB RAM / 1 CPU / 50 GB SSD ($18/month)
- **Better Plan:** 4 GB RAM / 2 CPU / 80 GB SSD ($24/month)
- **OS:** Ubuntu 22.04 LTS

---

## Step 1: Initial Server Setup

### 1.1 Connect to Your Droplet
```bash
ssh root@your_droplet_ip
```

### 1.2 Create a Non-Root User
```bash
# Create new user
adduser saampos

# Add to sudo group
usermod -aG sudo saampos

# Setup firewall
ufw allow OpenSSH
ufw enable

# Switch to new user
su - saampos
```

### 1.3 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

---

## Step 2: Install Required Software

### 2.1 Install Java (for Spring Boot)
```bash
# Install Java 17 (or 21)
sudo apt install -y openjdk-17-jdk

# Verify installation
ja```

### 2.2 Install PostgreSQL
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### 2.3 Install Node.js & npm (for Angular build)
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.4 Install Nginx (Web Server)
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2.5 Install Maven (for building backend)
```bash
# Install Maven
sudo apt install -y maven

# Verify installation
mvn -version
```

### 2.6 Install Git
```bash
sudo apt install -y git
```

---

## Step 3: Setup PostgreSQL Database

### 3.1 Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE chemsys;
CREATE USER bonnie WITH ENCRYPTED PASSWORD 'Targeted9@21';
GRANT ALL PRIVILEGES ON DATABASE chemsys TO bonnie;

# Grant schema privileges (PostgreSQL 15+)
\c chemsys
GRANT ALL ON SCHEMA public TO bonnie;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bonnie;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bonnie;

# Exit
\q
```

### 3.2 Configure PostgreSQL for External Connections (Optional)
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/17/main/postgresql.conf

# Find and change:
listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line (for local connections):
local   all             saampos_user                            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Step 4: Deploy the Application

### 4.1 Create Application Directory
```bash
# Create directory for the app
sudo mkdir -p /var/www/saampos
sudo chown -R saampos:saampos /var/www/saampos

# Navigate to directory
cd /var/www/saampos
```

### 4.2 Clone Your Repository (Option A)
```bash
# If using Git
git clone https://github.com/yourusername/saampos.git .

# Or manually upload files using SCP from your local machine:
# (Run this on your LOCAL machine, not on the droplet)
# scp -r /path/to/CS/* saampos@your_droplet_ip:/var/www/saampos/
```

### 4.3 Upload Files via SCP (Option B - Run on LOCAL machine)
```bash
# From your local machine, navigate to project directory
cd /Users/macbookprom1/Documents/workspace/CS

# Upload everything
scp -r . saampos@your_droplet_ip:/var/www/saampos/

# This will copy all files to the server
```

---

## Step 5: Configure Backend

### 5.1 Update application.yml
```bash
# Navigate to backend config
cd /var/www/saampos/chemsys/src/main/resources

# Edit application.yml
nano application.yml
```

**Update these sections:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/saampos
    username: saampos_user
    password: your_secure_password_here
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate  # Use 'validate' in production, not 'update'
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  
  flyway:
    enabled: true
    baseline-on-migrate: true

server:
  port: 8080
  address: localhost  # Only listen on localhost (Nginx will proxy)

logging:
  level:
    root: INFO
    com.chemsys: INFO
```

### 5.2 Build Backend
```bash
# Navigate to backend directory
cd /var/www/saampos/chemsys

# Build with Maven (skip tests for faster build)
mvn clean package -DskipTests

# The JAR file will be in target/ directory
ls -lh target/*.jar
```

---

## Step 6: Configure and Build Frontend

### 6.1 Update environment for production
```bash
# Navigate to frontend
cd /var/www/saampos/web/src/environments

# Edit environment.prod.ts
nano environment.prod.ts
```

**Update the API URL:**
```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'http://your_domain_or_ip/api'  // Or use /api for relative path
};
```

### 6.2 Install Dependencies and Build
```bash
# Navigate to frontend directory
cd /var/www/saampos/web

# Install dependencies
npm install

# Build for production
npm run build -- --configuration production

# Built files will be in dist/web/browser/
ls -lh dist/web/browser/
```

---

## Step 7: Create Systemd Service for Backend

### 7.1 Create Service File
```bash
sudo nano /etc/systemd/system/saampos.service
```

**Add this content:**
```ini
[Unit]
Description=SaamPOS Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=saampos
WorkingDirectory=/var/www/saampos/chemsys
ExecStart=/usr/bin/java -jar /var/www/saampos/chemsys/target/chemsys-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Environment variables (optional)
Environment="SPRING_PROFILES_ACTIVE=prod"
Environment="SERVER_PORT=8080"

[Install]
WantedBy=multi-user.target
```

### 7.2 Enable and Start Service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable saampos

# Start the service
sudo systemctl start saampos

# Check status
sudo systemctl status saampos

# View logs
sudo journalctl -u saampos -f
```

---

## Step 8: Configure Nginx

### 8.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/saampos
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;  # Or use your_droplet_ip

    # Frontend - Angular app
    root /var/www/saampos/web/dist/web/browser;
    index index.html;

    # Frontend routes (Angular routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API - Proxy to Spring Boot
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large requests
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Logs
    access_log /var/log/nginx/saampos_access.log;
    error_log /var/log/nginx/saampos_error.log;
}
```

### 8.2 Enable Site and Test
```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/saampos /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 9: Setup SSL with Let's Encrypt (HTTPS)

### 9.1 Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2 Obtain SSL Certificate
```bash
# Make sure your domain DNS points to your droplet IP first!

# Get certificate
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (recommended)
```

### 9.3 Auto-Renewal Setup
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up auto-renewal via systemd timer
# Check timer status
sudo systemctl status certbot.timer
```

---

## Step 10: Verification & Testing

### 10.1 Check Services
```bash
# Check backend
sudo systemctl status saampos

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo systemctl status postgresql
```

### 10.2 Test Application
```bash
# Test backend API directly
curl http://localhost:8080/api/v1/health

# Test through Nginx
curl http://your_domain.com/api/v1/health

# Or visit in browser:
# http://your_domain.com
```

### 10.3 View Logs
```bash
# Backend logs
sudo journalctl -u saampos -f

# Nginx access logs
sudo tail -f /var/log/nginx/saampos_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/saampos_error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## Step 11: Post-Deployment Tasks

### 11.1 Setup Database Backups
```bash
# Create backup script
sudo nano /usr/local/bin/backup-saampos.sh
```

**Add this script:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/saampos"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U saampos_user saampos | gzip > $BACKUP_DIR/saampos_$TIMESTAMP.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "saampos_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/saampos_$TIMESTAMP.sql.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-saampos.sh

# Setup daily cron job
sudo crontab -e

# Add this line (runs at 2 AM daily):
0 2 * * * /usr/local/bin/backup-saampos.sh
```

### 11.2 Setup Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop nethogs

# Monitor system resources
htop

# Monitor network
sudo nethogs
```

### 11.3 Configure Log Rotation
```bash
# Backend logs are handled by systemd journal
# Configure journal retention
sudo nano /etc/systemd/journald.conf

# Set these values:
SystemMaxUse=500M
MaxRetentionSec=1month

# Restart journald
sudo systemctl restart systemd-journald
```

---

## Step 12: Common Commands

### Application Management
```bash
# Restart backend
sudo systemctl restart saampos

# Stop backend
sudo systemctl stop saampos

# Start backend
sudo systemctl start saampos

# View backend logs
sudo journalctl -u saampos -f
```

### Nginx Management
```bash
# Restart Nginx
sudo systemctl restart nginx

# Reload Nginx (no downtime)
sudo systemctl reload nginx

# Test Nginx config
sudo nginx -t
```

### Database Management
```bash
# Connect to database
psql -U saampos_user -d saampos

# Create manual backup
pg_dump -U saampos_user saampos > backup.sql

# Restore from backup
psql -U saampos_user -d saampos < backup.sql
```

### Redeployment (Updates)
```bash
# Pull latest code
cd /var/www/saampos
git pull origin main

# Rebuild backend
cd chemsys
mvn clean package -DskipTests

# Rebuild frontend
cd ../web
npm run build -- --configuration production

# Restart services
sudo systemctl restart saampos
sudo systemctl reload nginx
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
sudo journalctl -u saampos -n 100

# Check if port 8080 is in use
sudo lsof -i :8080

# Test JAR manually
cd /var/www/saampos/chemsys
java -jar target/chemsys-0.0.1-SNAPSHOT.jar
```

### Database Connection Issues
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U saampos_user -d saampos -h localhost

# Check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Nginx Issues
```bash
# Check Nginx config
sudo nginx -t

# View error log
sudo tail -f /var/log/nginx/error.log

# Check permissions
ls -la /var/www/saampos/web/dist/web/browser/
```

### 502 Bad Gateway
- Backend is not running: `sudo systemctl start saampos`
- Port mismatch in Nginx config
- Firewall blocking port 8080 locally (should only listen on localhost)

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Setup firewall (UFW) properly
- [ ] Enable SSL/HTTPS with Let's Encrypt
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Setup automated backups
- [ ] Disable root SSH login
- [ ] Use SSH keys instead of passwords
- [ ] Setup fail2ban for brute force protection
- [ ] Regular log monitoring
- [ ] Keep application dependencies updated

---

## Performance Optimization

### Backend JVM Tuning
Edit `/etc/systemd/system/saampos.service`:
```ini
ExecStart=/usr/bin/java -Xms512m -Xmx1g -XX:+UseG1GC -jar /var/www/saampos/chemsys/target/chemsys-0.0.1-SNAPSHOT.jar
```

### PostgreSQL Tuning
Edit `/etc/postgresql/14/main/postgresql.conf`:
```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
max_connections = 100
```

### Nginx Caching
Add to Nginx config:
```nginx
# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|ttf)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Quick Reference

### URLs
- **Frontend:** http://your_domain.com
- **Backend API:** http://your_domain.com/api
- **Health Check:** http://your_domain.com/api/v1/health

### Important Paths
- **Application:** `/var/www/saampos`
- **Backend JAR:** `/var/www/saampos/chemsys/target/*.jar`
- **Frontend Build:** `/var/www/saampos/web/dist/web/browser`
- **Nginx Config:** `/etc/nginx/sites-available/saampos`
- **Service File:** `/etc/systemd/system/saampos.service`
- **Logs:** `/var/log/nginx/` and `sudo journalctl -u saampos`

---

## Support

If you encounter issues:
1. Check logs: `sudo journalctl -u saampos -f`
2. Verify services: `sudo systemctl status saampos nginx postgresql`
3. Test connectivity: `curl http://localhost:8080/api/v1/health`
4. Check firewall: `sudo ufw status`

---

**Status:** 📋 Ready for Deployment!

Follow these steps in order, and your SaamPOS application will be live on Digital Ocean! 🚀









