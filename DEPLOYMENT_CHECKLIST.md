# SaamPOS Deployment Checklist ✅

Use this checklist to track your deployment progress.

---

## Pre-Deployment (Local Machine)

### Prerequisites
- [ ] Digital Ocean account created
- [ ] Droplet created (Ubuntu 22.04, 2GB+ RAM)
- [ ] Domain name purchased (optional)
- [ ] Domain DNS pointed to droplet IP
- [ ] SSH key setup for droplet access

### Code Preparation
- [ ] All code committed and tested locally
- [ ] Backend builds successfully: `cd chemsys && mvn clean package`
- [ ] Frontend builds successfully: `cd web && npm run build`
- [ ] Database migrations tested
- [ ] Environment variables documented

---

## Server Setup

### Step 1: Initial Server Access ✅
- [ ] SSH into droplet: `ssh root@your_ip`
- [ ] Create non-root user: `adduser saampos`
- [ ] Add user to sudo: `usermod -aG sudo saampos`
- [ ] Setup firewall: `ufw allow OpenSSH && ufw enable`
- [ ] Update system: `apt update && apt upgrade -y`

### Step 2: Install Software ✅
- [ ] Install Java 17: `apt install openjdk-17-jdk`
- [ ] Install PostgreSQL: `apt install postgresql postgresql-contrib`
- [ ] Install Node.js 20: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash -`
- [ ] Install Node.js: `apt install nodejs`
- [ ] Install Nginx: `apt install nginx`
- [ ] Install Maven: `apt install maven`
- [ ] Install Git: `apt install git`
- [ ] Verify all installations

### Step 3: Database Setup ✅
- [ ] Access PostgreSQL: `sudo -u postgres psql`
- [ ] Create database: `CREATE DATABASE saampos;`
- [ ] Create user: `CREATE USER saampos_user WITH PASSWORD 'password';`
- [ ] Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE saampos TO saampos_user;`
- [ ] Configure pg_hba.conf for local access
- [ ] Restart PostgreSQL: `systemctl restart postgresql`
- [ ] Test connection: `psql -U saampos_user -d saampos`

---

## Application Deployment

### Step 4: Upload Code ✅
- [ ] Create app directory: `mkdir -p /var/www/saampos`
- [ ] Set ownership: `chown saampos:saampos /var/www/saampos`
- [ ] Upload files via SCP or clone from Git
- [ ] Verify all files present

### Step 5: Configure Backend ✅
- [ ] Edit `application.yml` with correct database credentials
- [ ] Set `server.address` to `localhost`
- [ ] Set production logging levels
- [ ] Update any environment-specific configs
- [ ] Build backend: `cd chemsys && mvn clean package -DskipTests`
- [ ] Verify JAR file created: `ls target/*.jar`

### Step 6: Configure Frontend ✅
- [ ] Edit `environment.prod.ts` with production API URL
- [ ] Install dependencies: `cd web && npm install`
- [ ] Build for production: `npm run build -- --configuration production`
- [ ] Verify build output: `ls dist/web/browser/`

### Step 7: Create Backend Service ✅
- [ ] Create service file: `/etc/systemd/system/saampos.service`
- [ ] Copy service configuration from guide
- [ ] Update JAR path if needed
- [ ] Reload systemd: `systemctl daemon-reload`
- [ ] Enable service: `systemctl enable saampos`
- [ ] Start service: `systemctl start saampos`
- [ ] Check status: `systemctl status saampos`
- [ ] View logs: `journalctl -u saampos -f`
- [ ] Test backend: `curl http://localhost:8080/api/v1/health`

---

## Web Server Configuration

### Step 8: Configure Nginx ✅
- [ ] Create Nginx config: `/etc/nginx/sites-available/saampos`
- [ ] Copy configuration from guide
- [ ] Update `server_name` with your domain/IP
- [ ] Update `root` path to Angular build output
- [ ] Enable site: `ln -s /etc/nginx/sites-available/saampos /etc/nginx/sites-enabled/`
- [ ] Remove default site (optional): `rm /etc/nginx/sites-enabled/default`
- [ ] Test config: `nginx -t`
- [ ] Reload Nginx: `systemctl reload nginx`
- [ ] Configure firewall: `ufw allow 'Nginx Full'`

### Step 9: Setup SSL (Optional but Recommended) ✅
- [ ] Install Certbot: `apt install certbot python3-certbot-nginx`
- [ ] Obtain certificate: `certbot --nginx -d your_domain.com`
- [ ] Follow prompts and accept terms
- [ ] Choose to redirect HTTP to HTTPS
- [ ] Test auto-renewal: `certbot renew --dry-run`
- [ ] Verify HTTPS works: `https://your_domain.com`

---

## Verification & Testing

### Step 10: Test Application ✅
- [ ] Backend API responds: `curl http://localhost:8080/api/v1/health`
- [ ] Frontend loads: Visit `http://your_domain.com`
- [ ] Can access login page
- [ ] Can login with test credentials
- [ ] Backend logs look normal: `journalctl -u saampos -n 100`
- [ ] Nginx logs show requests: `tail /var/log/nginx/saampos_access.log`
- [ ] No errors in Nginx: `tail /var/log/nginx/saampos_error.log`
- [ ] Database connection working
- [ ] API endpoints responding correctly

### Step 11: Test All Features ✅
- [ ] Login/Logout works
- [ ] Dashboard loads and displays data
- [ ] POS system functions
- [ ] Sales creation works
- [ ] Credit management works
- [ ] Inventory management works
- [ ] User management works (if admin)
- [ ] Branch management works (if admin)
- [ ] Receipt printing works
- [ ] All API endpoints respond correctly

---

## Post-Deployment

### Step 12: Setup Monitoring & Backups ✅
- [ ] Create backup script: `/usr/local/bin/backup-saampos.sh`
- [ ] Make executable: `chmod +x /usr/local/bin/backup-saampos.sh`
- [ ] Test backup: Run script manually
- [ ] Setup cron job for daily backups
- [ ] Configure log rotation
- [ ] Install monitoring tools: `apt install htop`

### Step 13: Security Hardening ✅
- [ ] Change database password from default
- [ ] Disable root SSH login (edit `/etc/ssh/sshd_config`)
- [ ] Setup SSH key authentication
- [ ] Install fail2ban: `apt install fail2ban`
- [ ] Configure fail2ban for SSH protection
- [ ] Review firewall rules: `ufw status`
- [ ] Setup automatic security updates
- [ ] Document all passwords securely

### Step 14: Documentation ✅
- [ ] Document server IP address
- [ ] Document domain name
- [ ] Document database credentials (secure location)
- [ ] Document SSH access details
- [ ] Document application URLs
- [ ] Create runbook for common operations
- [ ] Share access with team (if applicable)

---

## Maintenance Tasks

### Daily
- [ ] Check application is running: `systemctl status saampos`
- [ ] Review error logs for issues
- [ ] Monitor disk space: `df -h`

### Weekly
- [ ] Review access logs for suspicious activity
- [ ] Check backup success
- [ ] Monitor system resources: `htop`
- [ ] Review application logs

### Monthly
- [ ] Update system packages: `apt update && apt upgrade`
- [ ] Review and clean old logs
- [ ] Test backup restoration
- [ ] Check SSL certificate expiry
- [ ] Review user access and permissions

---

## Quick Commands Reference

```bash
# View backend logs
sudo journalctl -u saampos -f

# Restart backend
sudo systemctl restart saampos

# Restart Nginx
sudo systemctl reload nginx

# Check all services
sudo systemctl status saampos nginx postgresql

# Connect to database
psql -U saampos_user -d saampos

# Create backup
pg_dump -U saampos_user saampos > backup.sql

# View disk usage
df -h

# View memory usage
free -h

# Check listening ports
sudo ss -tulpn
```

---

## Troubleshooting Guide

### Backend Not Starting
1. [ ] Check logs: `journalctl -u saampos -n 100`
2. [ ] Verify JAR path in service file
3. [ ] Check database connection in application.yml
4. [ ] Test JAR manually: `java -jar target/*.jar`
5. [ ] Check port 8080 availability: `lsof -i :8080`

### Frontend Not Loading
1. [ ] Check Nginx config: `nginx -t`
2. [ ] Verify build files exist: `ls /var/www/saampos/web/dist/web/browser/`
3. [ ] Check Nginx error log: `tail /var/log/nginx/saampos_error.log`
4. [ ] Verify file permissions
5. [ ] Clear browser cache

### Database Issues
1. [ ] Check PostgreSQL running: `systemctl status postgresql`
2. [ ] Test connection: `psql -U saampos_user -d saampos`
3. [ ] Check credentials in application.yml
4. [ ] Review pg_hba.conf
5. [ ] Check PostgreSQL logs

### 502 Bad Gateway
1. [ ] Backend not running: `systemctl status saampos`
2. [ ] Check backend logs for errors
3. [ ] Verify Nginx proxy settings
4. [ ] Check firewall rules

---

## Emergency Contacts

**Server Details:**
- IP Address: `___________________`
- Domain: `___________________`
- SSH User: `saampos`
- Database: `saampos`

**Backup Location:**
- `/var/backups/saampos/`

**Important Logs:**
- Backend: `journalctl -u saampos`
- Nginx: `/var/log/nginx/`
- PostgreSQL: `/var/log/postgresql/`

---

## Deployment Status

**Date Deployed:** `___________________`  
**Deployed By:** `___________________`  
**Version:** `___________________`  
**Notes:** `___________________`

---

✅ **Deployment Complete!**

Your SaamPOS application should now be live and accessible at your domain/IP address.









