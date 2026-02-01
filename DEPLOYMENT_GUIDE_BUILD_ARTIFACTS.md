# SaamPOS - Deployment with Build Artifacts Only

## Overview
This guide deploys only the **compiled/built files** to your Digital Ocean droplet:
- Backend: Pre-built JAR file
- Frontend: Pre-built Angular production files

**Benefits:**
- ✅ Faster deployment (no compilation on server)
- ✅ Less server resources needed (no Maven, Node.js required)
- ✅ More secure (source code not on server)
- ✅ Smaller droplet required

---

## What You'll Deploy

### Backend
- ✅ Single JAR file: `chemsys-0.0.1-SNAPSHOT.jar`
- ✅ Configuration: `application.yml`

### Frontend
- ✅ Built Angular files from: `web/dist/web/browser/`

**NO SOURCE CODE goes to the server!**

---

## Step 1: Build Locally (On Your Mac)

### 1.1 Build Backend
```bash
# Navigate to backend
cd /Users/macbookprom1/Documents/workspace/CS/chemsys

# Clean and build
mvn clean package -DskipTests

# Verify JAR was created
ls -lh target/*.jar
# You should see: chemsys-0.0.1-SNAPSHOT.jar
```

### 1.2 Build Frontend
```bash
# Navigate to frontend
cd /Users/macbookprom1/Documents/workspace/CS/web

# Build for production
npm run build -- --configuration production

# Verify build
ls -lh dist/web/browser/
# You should see: index.html and other files
```

### 1.3 Prepare Config File
```bash
# Copy application.yml for editing
cd /Users/macbookprom1/Documents/workspace/CS/chemsys/src/main/resources
cp application.yml application-prod.yml

# Edit application-prod.yml for production
nano application-prod.yml
```

**Update application-prod.yml:**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/saampos
    username: saampos_user
    password: YOUR_SECURE_PASSWORD  # Change this!
    driver-class-name: org.postgresql.Driver
  
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  
  flyway:
    enabled: true
    baseline-on-migrate: true

server:
  port: 8080
  address: localhost

logging:
  level:
    root: INFO
    com.chemsys: INFO
```

---

## Step 2: Server Setup (Minimal)

### 2.1 Connect to Droplet
```bash
ssh root@your_droplet_ip
```

### 2.2 Install Only Runtime Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Java Runtime (JRE only, not JDK)
apt install -y openjdk-17-jre-headless

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# That's it! No Maven, no Node.js needed!
```

### 2.3 Create Application User
```bash
# Create user
adduser saampos
usermod -aG sudo saampos

# Create app directory
mkdir -p /var/www/saampos/backend
mkdir -p /var/www/saampos/frontend
chown -R saampos:saampos /var/www/saampos
```

### 2.4 Setup Firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Step 3: Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE saampos;
CREATE USER saampos_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE saampos TO saampos_user;

# Connect to database
\c saampos

# Grant schema privileges
GRANT ALL ON SCHEMA public TO saampos_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO saampos_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO saampos_user;

# Exit
\q
```

---

## Step 4: Upload Build Artifacts (From Your Mac)

### 4.1 Upload Backend JAR
```bash
# From your Mac terminal
cd /Users/macbookprom1/Documents/workspace/CS

# Upload JAR file
scp chemsys/target/chemsys-0.0.1-SNAPSHOT.jar saampos@your_droplet_ip:/var/www/saampos/backend/

# Upload production config
scp chemsys/src/main/resources/application-prod.yml saampos@your_droplet_ip:/var/www/saampos/backend/application.yml
```

### 4.2 Upload Frontend Build
```bash
# From your Mac terminal
cd /Users/macbookprom1/Documents/workspace/CS/web

# Upload frontend build (this might take a minute)
scp -r dist/web/browser/* saampos@your_droplet_ip:/var/www/saampos/frontend/

# Verify upload completed
ssh saampos@your_droplet_ip "ls -la /var/www/saampos/frontend/"
```

### 4.3 Verify Files on Server
```bash
# SSH into server
ssh saampos@your_droplet_ip

# Check backend files
ls -lh /var/www/saampos/backend/
# Should show: chemsys-0.0.1-SNAPSHOT.jar and application.yml

# Check frontend files
ls -lh /var/www/saampos/frontend/
# Should show: index.html, assets/, etc.
```

---

## Step 5: Create Backend Service

### 5.1 Create Systemd Service File
```bash
# On the server
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
WorkingDirectory=/var/www/saampos/backend
ExecStart=/usr/bin/java -Xms512m -Xmx1g -jar /var/www/saampos/backend/chemsys-0.0.1-SNAPSHOT.jar --spring.config.location=/var/www/saampos/backend/application.yml
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 5.2 Start Backend Service
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable saampos

# Start service
sudo systemctl start saampos

# Check status
sudo systemctl status saampos

# View logs (should show application starting)
sudo journalctl -u saampos -f
```

**Press Ctrl+C to stop viewing logs once you see the app started successfully.**

---

## Step 6: Configure Nginx

### 6.1 Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/saampos
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name your_domain.com www.your_domain.com;  # Or use your IP

    # Frontend - Angular built files
    root /var/www/saampos/frontend;
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
        
        # Timeouts
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }

    # Cache static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    access_log /var/log/nginx/saampos_access.log;
    error_log /var/log/nginx/saampos_error.log;
}
```

### 6.2 Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/saampos /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 7: Test Deployment

### 7.1 Check Services
```bash
# Check backend
sudo systemctl status saampos

# Check Nginx
sudo systemctl status nginx

# Check database
sudo systemctl status postgresql
```

### 7.2 Test Backend API
```bash
# Test directly (should respond with health check or 404)
curl http://localhost:8080/api/v1/health

# Or test any endpoint
curl http://localhost:8080/api/v1/
```

### 7.3 Test Through Nginx
```bash
# Test frontend
curl http://your_droplet_ip/

# Test API through Nginx
curl http://your_droplet_ip/api/v1/health
```

### 7.4 Open in Browser
```
http://your_droplet_ip
```

You should see the SaamPOS login page!

---

## Step 8: Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (make sure DNS points to your server first!)
sudo certbot --nginx -d your_domain.com -d www.your_domain.com

# Follow prompts and choose to redirect HTTP to HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Redeployment Process (Updates)

When you make changes to your app:

### On Your Mac:
```bash
# 1. Build backend
cd /Users/macbookprom1/Documents/workspace/CS/chemsys
mvn clean package -DskipTests

# 2. Build frontend
cd ../web
npm run build -- --configuration production

# 3. Upload backend JAR
scp chemsys/target/chemsys-0.0.1-SNAPSHOT.jar saampos@your_droplet_ip:/var/www/saampos/backend/

# 4. Upload frontend
scp -r dist/web/browser/* saampos@your_droplet_ip:/var/www/saampos/frontend/
```

### On Server:
```bash
# Restart backend
sudo systemctl restart saampos

# Reload Nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status saampos
```

**That's it! Your updates are live.**

---

## Quick Redeploy Script (For Your Mac)

Create `redeploy.sh`:
```bash
#!/bin/bash

SERVER="saampos@your_droplet_ip"
PROJECT="/Users/macbookprom1/Documents/workspace/CS"

echo "Building backend..."
cd $PROJECT/chemsys
mvn clean package -DskipTests || exit 1

echo "Building frontend..."
cd $PROJECT/web
npm run build -- --configuration production || exit 1

echo "Uploading backend..."
scp $PROJECT/chemsys/target/chemsys-0.0.1-SNAPSHOT.jar $SERVER:/var/www/saampos/backend/

echo "Uploading frontend..."
scp -r $PROJECT/web/dist/web/browser/* $SERVER:/var/www/saampos/frontend/

echo "Restarting services..."
ssh $SERVER "sudo systemctl restart saampos && sudo systemctl reload nginx"

echo "Deployment complete!"
echo "Check status: ssh $SERVER 'sudo systemctl status saampos'"
```

Make executable:
```bash
chmod +x redeploy.sh
```

Use it:
```bash
./redeploy.sh
```

---

## Backup Strategy

### Create Backup Script on Server
```bash
sudo nano /usr/local/bin/backup-saampos.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/saampos"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U saampos_user saampos | gzip > $BACKUP_DIR/saampos_db_$TIMESTAMP.sql.gz

# Backup JAR file
cp /var/www/saampos/backend/chemsys-0.0.1-SNAPSHOT.jar $BACKUP_DIR/backend_$TIMESTAMP.jar

# Keep only last 7 days
find $BACKUP_DIR -name "saampos_db_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "backend_*.jar" -mtime +7 -delete

echo "Backup completed: $TIMESTAMP"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-saampos.sh

# Test it
sudo /usr/local/bin/backup-saampos.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-saampos.sh
```

---

## Server Disk Space Requirements

**Minimal Setup:**
- Backend JAR: ~50-100 MB
- Frontend Build: ~5-10 MB
- PostgreSQL Database: ~100-500 MB (grows with data)
- Nginx: ~5 MB
- Java Runtime: ~200 MB
- Operating System: ~2-3 GB

**Total:** A 10GB droplet is sufficient to start!

---

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
sudo journalctl -u saampos -n 100

# Test JAR manually
cd /var/www/saampos/backend
java -jar chemsys-0.0.1-SNAPSHOT.jar
```

### Frontend Not Loading
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/saampos_error.log

# Verify files exist
ls -la /var/www/saampos/frontend/

# Check permissions
sudo chown -R saampos:saampos /var/www/saampos/
```

### Database Connection Failed
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
psql -U saampos_user -d saampos -h localhost

# Check application.yml has correct credentials
cat /var/www/saampos/backend/application.yml
```

---

## Key Differences from Full Deployment

### ✅ What's NOT Needed on Server:
- ❌ Maven (only Java Runtime needed)
- ❌ Node.js & npm
- ❌ Source code files
- ❌ Git
- ❌ Build tools

### ✅ What IS on Server:
- ✅ Java 17 JRE (runtime only)
- ✅ PostgreSQL
- ✅ Nginx
- ✅ JAR file (~100MB)
- ✅ Built frontend files (~10MB)
- ✅ Configuration file

**Result:** Much smaller, faster, and more secure deployment!

---

## Quick Reference

### Important Paths
```
/var/www/saampos/backend/chemsys-0.0.1-SNAPSHOT.jar  # Backend JAR
/var/www/saampos/backend/application.yml             # Backend config
/var/www/saampos/frontend/                           # Frontend files
/etc/systemd/system/saampos.service                  # Service definition
/etc/nginx/sites-available/saampos                   # Nginx config
```

### Common Commands
```bash
# Restart backend
sudo systemctl restart saampos

# View backend logs
sudo journalctl -u saampos -f

# Restart Nginx
sudo systemctl reload nginx

# Check all services
sudo systemctl status saampos nginx postgresql
```

---

## Next Steps

1. **Build locally** (Step 1)
2. **Setup server** (Steps 2-3)
3. **Upload artifacts** (Step 4)
4. **Configure services** (Steps 5-6)
5. **Test** (Step 7)
6. **Setup SSL** (Step 8)
7. **Done!** 🎉

**This approach is production-ready and industry standard!**









