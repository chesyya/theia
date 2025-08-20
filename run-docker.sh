#!/bin/bash

# Theia Docker Run Script
# Quick script to run the Theia Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="theia-ide:latest"
CONTAINER_NAME="theia-ide"
PORT="3000"

echo -e "${BLUE}🚀 Starting Theia Docker Container${NC}"
echo -e "${BLUE}==================================${NC}"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed${NC}"
    exit 1
fi

# Check if image exists
if ! docker images | grep -q "theia-ide"; then
    echo -e "${YELLOW}⚠️  Theia image not found. Building it first...${NC}"
    if [[ -f "build-docker.sh" ]]; then
        ./build-docker.sh
    else
        echo -e "${RED}❌ Error: build-docker.sh script not found${NC}"
        exit 1
    fi
fi

# Stop and remove existing container if running
if docker ps -a | grep -q ${CONTAINER_NAME}; then
    echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
fi

# Get the current directory for plugin mounting
CURRENT_DIR=$(pwd)

echo -e "${GREEN}🐳 Starting Theia container...${NC}"
echo -e "Port: ${GREEN}${PORT}${NC}"
echo -e "Plugins: ${GREEN}${CURRENT_DIR}/plugins${NC}"
echo -e "Tests: ${GREEN}${CURRENT_DIR}/test${NC}"
echo ""

# Run the container
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:3000 \
    -v "${CURRENT_DIR}/plugins:/home/project/plugins" \
    -v "${CURRENT_DIR}/test:/home/theia/test" \
    --restart unless-stopped \
    ${IMAGE_NAME}

# Wait a moment for container to start
sleep 3

# Check if container is running
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo -e "${GREEN}✅ Theia container is running!${NC}"
    echo ""
    echo -e "${BLUE}📝 Container Information:${NC}"
    echo -e "Container ID: ${GREEN}$(docker ps --format '{{.ID}}' --filter name=${CONTAINER_NAME})${NC}"
    echo -e "Status: ${GREEN}$(docker ps --format '{{.Status}}' --filter name=${CONTAINER_NAME})${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo -e "Theia IDE: ${GREEN}http://localhost:${PORT}${NC}"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "View logs: ${GREEN}docker logs ${CONTAINER_NAME}${NC}"
    echo -e "Stop container: ${GREEN}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "Enter container: ${GREEN}docker exec -it ${CONTAINER_NAME} /bin/sh${NC}"
    echo -e "Run tests: ${GREEN}docker exec -it ${CONTAINER_NAME} /home/theia/test/theia-test-cli/out/bin.mjs --help${NC}"
    echo ""
    echo -e "${GREEN}🎉 Theia is ready to use!${NC}"
else
    echo -e "${RED}❌ Failed to start container${NC}"
    echo -e "Check logs with: ${YELLOW}docker logs ${CONTAINER_NAME}${NC}"
    exit 1
fi