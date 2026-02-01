# Viewing Application Logs on Digital Ocean

## Quick Guide

Your SaamPOS application logs are managed by systemd. Here's how to access them.

---

## Backend Application Silent Logs

The backend runs as a systemd service named `saampos`. All logs are captured by journald.

### View Live Logs (Streaming)
```bash
sudo journalctl -u saampos -f
```
This shows logs in real-time as they're generated. Press `Ctrl+C` to stop.

### View Recent Logs
```bash
# Last 100 lines
sudo journalctl -u saampos -n 100

# Last 500 lines
sudo journalctl -u saampos -n 500

# Last 1000 lines
sudo journalctl -u saampos -n 1000
```

### Filter Logs by Time
```bash
# Logs from today
sudo journalctl -u saampos --since today

# Logs from the last hour
sudo journalctl -u saampos --since "1 hour ago"

# Logs from the last 24 hours
sudo journalctl -u saampos --since "24 hours ago"

# Logs since a specific time
sudo journalctl -u saampos --since "2024-01-15 10:00:00"

# Logs between two times
sudo journalctl -u saampos --since "2024-01-15 10:00:00" --until "2024-01-15 18:00:00"
```

### Filter by Priority
```bash
# Only show errors and warnings
sudo journalctl -u saampos -p err

# Show critical, alert, and emergency only
sudo journalctl -u saampos -p crit

# Show warnings and above
sudo journalctl -u sa contained -p warning
```

### Search Within Logs
```bash
# Search for specific text
sudo journalctl -u saampos | grep "error"

# Case-insensitive search
sudo journalctl -u saampos | grep -i "exception"

# Search with context (shows 5 lines before and after match)
sudo journalctl -u saampos | grep -A 5 -B 5 "sql"
```

### Export Logs
```bash
# Save to file
sudo journalctl -u saampos --since "24 hours ago" > /tmp/saampos_logs.txt

# View exported file
cat /tmp/saampos_logs.txt
```

### Other Useful Options
```bash
# Show logs in reverse order (newest first)
sudo journalctl -u saampos --reverse

# Follow logs with timestamps
sudo journalctl -u saampos -f --utc

# Show logs from specific boot
sudo journalctl -u saampos -b 0

# Show logs from previous boot
sudo journalctl -u saampos -b -1

# Combine filters
sudo journalctl -u saampos -n 500 -p err --since today
```

---

## Nginx Logs

### Access Logs
```bash
# View Nginx access logs in real-time
sudo tail -f /var/log/nginx/saampos_access.log

# View last 100 lines
sudo tail -n 100 /var/log/nginx/saampos_access.log

# View last 500 lines
sudo tail -n 500 /var/log/nginx/saampos_access.log
```

### Error Logs
```bash
# View Nginx error logs in real-time
sudo tail -f /var/log/nginx/saampos_error.log

# View last 100 lines
sudo tail -n 100 /var/log/nginx/saampos_error.log

# View all errors
sudo grep -i error /var/log/nginx/saampos_error.log
```

---

## PostgreSQL Logs

```bash
# Find PostgreSQL log location
sudo -u postgres psql -c "SHOW log_directory;"

# View PostgreSQL logs (path may vary by version)
sudo tail -f /var/log/postgresql/postgresql-main.log

# Or for specific version
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## System Logs

### All System Logs
```bash
# View all system logs
sudo journalctl -f

# View system logs from today
sudo journalctl --since today

# View system errors
sudo journalctl -p err
```

### System Resource Monitoring
```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Service status
sudo systemctl status saampos nginx postgresql
```

---

## Troubleshooting Commands

### If Backend Won't Start
```bash
# Check why it failed
sudo journalctl -u saampos -n 100

# Check if port 8080 is in use
sudo lsof -i :8080

# Check service status with details
sudo systemctl status saampos -l
```

### If Nginx Returns Errors
```bash
# Check Nginx error logs
sudo tail -50 /var/log/nginx/saampos_error.log

# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -50 /var/log/postgresql/postgresql-main.log

# Test database connection
sudo -u postgres psql -c "SELECT version();"
```

---

## Quick Reference

### Most Common Commands
```bash
# View live backend logs
sudo journalctl -u saampos -f

# View recent backend logs
sudo journalctl -u saampos -n 100

# View backend errors only
sudo journalctl -u saampos -p err -n 50

# View today's backend logs
sudo journalctl -u saampos --since today

# View Nginx access logs
sudo tail -f /var/log/nginx/saampos_access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/saampos_error.log

# Check service status
sudo systemctl status saampos
```

---

## Important Log Locations

- **Backend Logs**: Managed by systemd journal
- **Nginx Access Logs**: `/var/log/nginx/saampos_access.log`
- **Nginx Error Logs**: `/var/log/nginx/saampos_error.log`
- **PostgreSQL Logs**: `/var/log/postgresql/postgresql-main.log` (or version-specific)
- **System Logs**: Managed by systemd journal

---

## Tips

1. **Real-time Monitoring**: Use `-f` flag for live log streaming
2. **Search Efficiently**: Combine filters to narrow down logs
3. **Export for Analysis**: Export logs to file for offline analysis
4. **Monitor Errors**: Regularly check error logs for issues
5. **Disk Space**: Old logs are automatically managed by systemd

---

## Preventing Log Issues

### Check Journal Size
```bash
# Check current journal size
journalctl --disk-usage

# Clean old logs (keeps last 2 days)
sudo journalctl --vacuum-time=2d

# Clean if journal exceeds 500MB
sudo journalctl --vacuum-size=500M
```

---

## Need Help?

If you're seeing errors in the logs:
1. Note the exact error message and timestamp
2. Check the surrounding log entries for context
3. Verify service status: `sudo systemctl status saampos`
4. Check Nginx errors: `sudo tail -50 /var/log/nginx/saampos_error.log`





