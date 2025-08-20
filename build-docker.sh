#!/bin/bash

# Theia Docker Build Script
# This script builds a Docker image for the Theia IDE with integrated test framework

set -e

# Configuration
IMAGE_NAME="theia-ide"
TAG="${1:-latest}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Building Theia Docker Image${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "Image: ${GREEN}${FULL_IMAGE_NAME}${NC}"
echo -e "Context: ${GREEN}$(pwd)${NC}"
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Error: Docker daemon is not running${NC}"
    exit 1
fi

# Show Docker info
echo -e "${YELLOW}📋 Docker Information:${NC}"
echo -e "Docker version: $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo -e "Available disk space:"
df -h . | tail -1 | awk '{print "  " $4 " available on " $6}'
echo ""

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "Dockerfile" ]]; then
    echo -e "${RED}❌ Error: Please run this script from the Theia project root directory${NC}"
    echo -e "Expected files: package.json, Dockerfile"
    exit 1
fi

# Check if test framework exists
if [[ ! -d "test" ]]; then
    echo -e "${YELLOW}⚠️  Warning: Test framework directory not found${NC}"
    echo -e "The image will be built without the test framework"
fi

# Remove existing image if it exists
if docker images | grep -q "^${IMAGE_NAME} "; then
    echo -e "${YELLOW}🗑️  Removing existing image ${FULL_IMAGE_NAME}${NC}"
    docker rmi ${FULL_IMAGE_NAME} || true
fi

# Build the Docker image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
echo -e "This may take several minutes depending on your system and network speed."
echo ""

# Build with progress output
if docker build \
    --tag ${FULL_IMAGE_NAME} \
    --build-arg NODE_ENV=production \
    --progress=plain \
    .; then
    
    echo ""
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    
    # Show image information
    echo ""
    echo -e "${BLUE}📊 Image Information:${NC}"
    docker images ${IMAGE_NAME} | head -2
    
    echo ""
    echo -e "${BLUE}💾 Image Size:${NC}"
    IMAGE_SIZE=$(docker images --format "table {{.Size}}" ${FULL_IMAGE_NAME} | tail -n +2)
    echo -e "Size: ${GREEN}${IMAGE_SIZE}${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 Build completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📝 Next Steps:${NC}"
    echo -e "1. Run the container:"
    echo -e "   ${GREEN}docker run -p 3000:3000 ${FULL_IMAGE_NAME}${NC}"
    echo ""
    echo -e "2. Run with plugin development volume:"
    echo -e "   ${GREEN}docker run -p 3000:3000 -v \$(pwd)/plugins:/home/project/plugins ${FULL_IMAGE_NAME}${NC}"
    echo ""
    echo -e "3. Access Theia IDE:"
    echo -e "   ${GREEN}http://localhost:3000${NC}"
    echo ""
    echo -e "4. Run tests using the test framework:"
    echo -e "   ${GREEN}docker exec -it <container_id> /home/theia/test/theia-test-cli/out/bin.mjs --help${NC}"
    echo ""
    
else
    echo ""
    echo -e "${RED}❌ Docker build failed!${NC}"
    echo -e "Please check the error messages above and try again."
    exit 1
fi