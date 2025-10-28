#!/bin/bash

# System Check Script for Meeting Transcript Generator
echo "========================================="
echo "System Requirements Check"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if all checks pass
ALL_CHECKS_PASSED=true

# Function to check command
check_command() {
    local cmd=$1
    local name=$2
    local install_hint=$3
    
    if command -v $cmd &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name is installed"
        if [ "$cmd" = "docker" ]; then
            docker --version
        elif [ "$cmd" = "go" ]; then
            go version
        elif [ "$cmd" = "python3" ]; then
            python3 --version
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT installed"
        echo "  Install: $install_hint"
        ALL_CHECKS_PASSED=false
        return 1
    fi
}

echo "1. Checking Docker..."
check_command "docker" "Docker" "https://www.docker.com/products/docker-desktop"

if command -v docker &> /dev/null; then
    # Check if Docker daemon is running
    if docker ps &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker daemon is running"
        
        # Check Docker Compose
        if docker compose version &> /dev/null; then
            echo -e "${GREEN}✓${NC} Docker Compose is available"
            docker compose version
        else
            echo -e "${RED}✗${NC} Docker Compose is NOT available"
            ALL_CHECKS_PASSED=false
        fi
    else
        echo -e "${RED}✗${NC} Docker daemon is NOT running"
        echo "  Start Docker Desktop application"
        ALL_CHECKS_PASSED=false
    fi
fi

echo ""
echo "2. Checking Go (Optional - only needed for local development)..."
check_command "go" "Go" "https://golang.org/dl/ (Optional: only needed if NOT using Docker)"

echo ""
echo "3. Checking Python..."
check_command "python3" "Python 3" "https://www.python.org/downloads/"

if command -v python3 &> /dev/null; then
    # Check for requests module
    if python3 -c "import requests" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Python 'requests' module is installed"
    else
        echo -e "${YELLOW}⚠${NC} Python 'requests' module is NOT installed"
        echo "  Install: pip3 install requests"
    fi
fi

echo ""
echo "========================================="
echo "Project Files Check"
echo "========================================="
echo ""

# Check required files
check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name exists"
        return 0
    else
        echo -e "${RED}✗${NC} $name is MISSING"
        ALL_CHECKS_PASSED=false
        return 1
    fi
}

check_file "docker-compose.yml" "docker-compose.yml"
check_file "go.mod" "go.mod"
check_file "go.sum" "go.sum"
check_file ".env" ".env configuration"
check_file "scripts/init-db.sql" "Database initialization script"

echo ""
echo "Checking service files..."
check_file "services/api-gateway/Dockerfile" "API Gateway Dockerfile"
check_file "services/audio-service/Dockerfile" "Audio Service Dockerfile"
check_file "services/transcription-service/Dockerfile" "Transcription Service Dockerfile"
check_file "services/diarization-service/Dockerfile" "Diarization Service Dockerfile"

echo ""
echo "Checking Go source files..."
GO_FILES=$(find . -name "*.go" 2>/dev/null | wc -l | tr -d ' ')
if [ "$GO_FILES" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $GO_FILES Go source files"
else
    echo -e "${RED}✗${NC} No Go source files found"
    ALL_CHECKS_PASSED=false
fi

echo ""
echo "========================================="
echo "Port Availability Check"
echo "========================================="
echo ""

# Check if ports are available
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} Port $port is already in use ($service)"
        echo "  Process: $(lsof -Pi :$port -sTCP:LISTEN | tail -n 1)"
    else
        echo -e "${GREEN}✓${NC} Port $port is available ($service)"
    fi
}

check_port 8080 "API Gateway"
check_port 8081 "Audio Service"
check_port 8082 "Transcription Service"
check_port 8083 "Diarization Service"
check_port 5432 "PostgreSQL"
check_port 5672 "RabbitMQ"
check_port 15672 "RabbitMQ Management"
check_port 6379 "Redis"

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""

if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All required checks passed!${NC}"
    echo ""
    echo "You can start the application with:"
    echo "  docker compose up -d"
    echo ""
    echo "Or run the test script:"
    echo "  ./test_app.sh"
    echo "  python3 test_app.py"
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please install missing requirements before proceeding."
    echo ""
    if ! command -v docker &> /dev/null || ! docker ps &> /dev/null; then
        echo "IMPORTANT: Start Docker Desktop first!"
    fi
fi

echo ""
echo "For detailed instructions, see:"
echo "  - QUICKSTART.md"
echo "  - README.md"
