#!/bin/bash

# SaamPOS Deployment Helper Script
# This script helps automate some deployment tasks
# Run this on your LOCAL machine to upload files to the server

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (UPDATE THESE)
SERVER_USER="saampos"
SERVER_IP="your_droplet_ip"
REMOTE_PATH="/var/www/saampos"
PROJECT_PATH="/Users/macbookprom1/Documents/workspace/CS"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   SaamPOS Deployment Helper${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command_exists ssh; then
        print_error "SSH not found. Please install SSH client."
        exit 1
    fi
    
    if ! command_exists scp; then
        print_error "SCP not found. Please install SCP."
        exit 1
    fi
    
    print_info "Prerequisites check passed!"
}

# Test server connection
test_connection() {
    print_info "Testing connection to server..."
    
    if ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 'Connection successful'" >/dev/null 2>&1; then
        print_info "Connection successful!"
    else
        print_error "Cannot connect to server. Check IP, username, and SSH keys."
        exit 1
    fi
}

# Build backend
build_backend() {
    print_info "Building backend..."
    
    cd "$PROJECT_PATH/chemsys"
    
    if mvn clean package -DskipTests; then
        print_info "Backend build successful!"
    else
        print_error "Backend build failed!"
        exit 1
    fi
}

# Build frontend
build_frontend() {
    print_info "Building frontend..."
    
    cd "$PROJECT_PATH/web"
    
    if npm run build -- --configuration production; then
        print_info "Frontend build successful!"
    else
        print_error "Frontend build failed!"
        exit 1
    fi
}

# Upload backend
upload_backend() {
    print_info "Uploading backend JAR file..."
    
    cd "$PROJECT_PATH/chemsys"
    
    JAR_FILE=$(ls target/*.jar | head -n 1)
    
    if [ -f "$JAR_FILE" ]; then
        scp "$JAR_FILE" $SERVER_USER@$SERVER_IP:$REMOTE_PATH/chemsys/target/
        print_info "Backend JAR uploaded!"
    else
        print_error "JAR file not found!"
        exit 1
    fi
}

# Upload frontend
upload_frontend() {
    print_info "Uploading frontend build..."
    
    cd "$PROJECT_PATH/web"
    
    if [ -d "dist/web/browser" ]; then
        # Create remote directory if it doesn't exist
        ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH/web/dist/web/"
        
        # Upload build files
        scp -r dist/web/browser $SERVER_USER@$SERVER_IP:$REMOTE_PATH/web/dist/web/
        print_info "Frontend build uploaded!"
    else
        print_error "Frontend build not found!"
        exit 1
    fi
}

# Upload application config
upload_config() {
    print_info "Uploading application.yml..."
    
    cd "$PROJECT_PATH/chemsys/src/main/resources"
    
    if [ -f "application.yml" ]; then
        scp application.yml $SERVER_USER@$SERVER_IP:$REMOTE_PATH/chemsys/src/main/resources/
        print_info "Configuration uploaded!"
        print_warning "Remember to update database credentials on the server!"
    else
        print_error "application.yml not found!"
    fi
}

# Restart backend service
restart_backend() {
    print_info "Restarting backend service..."
    
    ssh $SERVER_USER@$SERVER_IP "sudo systemctl restart saampos"
    
    if [ $? -eq 0 ]; then
        print_info "Backend service restarted!"
    else
        print_error "Failed to restart backend service!"
        exit 1
    fi
}

# Reload Nginx
reload_nginx() {
    print_info "Reloading Nginx..."
    
    ssh $SERVER_USER@$SERVER_IP "sudo systemctl reload nginx"
    
    if [ $? -eq 0 ]; then
        print_info "Nginx reloaded!"
    else
        print_error "Failed to reload Nginx!"
        exit 1
    fi
}

# Check deployment status
check_status() {
    print_info "Checking deployment status..."
    
    echo ""
    print_info "Backend Service Status:"
    ssh $SERVER_USER@$SERVER_IP "sudo systemctl status saampos --no-pager | head -n 10"
    
    echo ""
    print_info "Nginx Status:"
    ssh $SERVER_USER@$SERVER_IP "sudo systemctl status nginx --no-pager | head -n 10"
    
    echo ""
    print_info "Testing API endpoint:"
    ssh $SERVER_USER@$SERVER_IP "curl -s http://localhost:8080/api/v1/health || echo 'API not responding'"
}

# View logs
view_logs() {
    print_info "Viewing backend logs (last 50 lines)..."
    ssh $SERVER_USER@$SERVER_IP "sudo journalctl -u saampos -n 50 --no-pager"
}

# Menu
show_menu() {
    echo ""
    echo -e "${GREEN}What would you like to do?${NC}"
    echo "1. Full deployment (build + upload + restart)"
    echo "2. Build only (backend + frontend)"
    echo "3. Upload only (no build)"
    echo "4. Restart services"
    echo "5. Check deployment status"
    echo "6. View backend logs"
    echo "7. Test connection only"
    echo "0. Exit"
    echo ""
    read -p "Enter choice [0-7]: " choice
    
    case $choice in
        1)
            full_deployment
            ;;
        2)
            build_only
            ;;
        3)
            upload_only
            ;;
        4)
            restart_services
            ;;
        5)
            check_status
            ;;
        6)
            view_logs
            ;;
        7)
            test_connection
            ;;
        0)
            print_info "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice!"
            show_menu
            ;;
    esac
}

# Full deployment
full_deployment() {
    print_info "Starting full deployment..."
    check_prerequisites
    test_connection
    build_backend
    build_frontend
    upload_backend
    upload_frontend
    upload_config
    restart_backend
    reload_nginx
    check_status
    print_info "Deployment complete!"
}

# Build only
build_only() {
    print_info "Building application..."
    build_backend
    build_frontend
    print_info "Build complete!"
}

# Upload only
upload_only() {
    print_info "Uploading files..."
    check_prerequisites
    test_connection
    upload_backend
    upload_frontend
    print_info "Upload complete!"
}

# Restart services
restart_services() {
    print_info "Restarting services..."
    check_prerequisites
    test_connection
    restart_backend
    reload_nginx
    check_status
    print_info "Services restarted!"
}

# Main execution
main() {
    # Check if configuration is set
    if [ "$SERVER_IP" == "your_droplet_ip" ]; then
        print_warning "Please update SERVER_IP in this script before running!"
        print_warning "Edit this file: $0"
        exit 1
    fi
    
    # Show menu
    show_menu
}

# Run main
main









