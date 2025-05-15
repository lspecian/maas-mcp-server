#!/bin/bash

# Build and push the MAAS MCP Server Docker image
# Usage: ./build-docker.sh [registry/username]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print a message with a color
print_message() {
  echo -e "${2}${1}${NC}"
}

# Print a success message
print_success() {
  print_message "$1" "${GREEN}"
}

# Print a warning message
print_warning() {
  print_message "$1" "${YELLOW}"
}

# Print an error message
print_error() {
  print_message "$1" "${RED}"
}

# Default registry/username
DEFAULT_REGISTRY="ghcr.io/lspecian"
REGISTRY=${1:-$DEFAULT_REGISTRY}

# Image name and tag
IMAGE_NAME="maas-mcp-server"
TAG="latest"
FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"

# Build the Docker image
print_message "Building Docker image: ${FULL_IMAGE_NAME}..." "${YELLOW}"
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -eq 0 ]; then
  print_success "Docker image built successfully!"
else
  print_error "Failed to build Docker image!"
  exit 1
fi

# Ask if the user wants to push the image
read -p "Do you want to push the image to ${REGISTRY}? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Check if GITHUB_TOKEN is set
  if [ -z "${GITHUB_TOKEN}" ]; then
    print_warning "GITHUB_TOKEN environment variable is not set."
    print_message "Please set it with: export GITHUB_TOKEN=your_github_token" "${YELLOW}"
    read -p "Enter your GitHub token: " GITHUB_TOKEN
    if [ -z "${GITHUB_TOKEN}" ]; then
      print_error "No GitHub token provided. Cannot push to ghcr.io."
      exit 1
    fi
  fi

  # Login to GitHub Container Registry
  print_message "Logging in to GitHub Container Registry..." "${YELLOW}"
  # Extract username from registry path
  GITHUB_USERNAME=$(echo "${REGISTRY}" | cut -d'/' -f2)
  echo "${GITHUB_TOKEN}" | docker login ghcr.io -u ${GITHUB_USERNAME} --password-stdin
  
  if [ $? -ne 0 ]; then
    print_error "Failed to login to GitHub Container Registry!"
    exit 1
  fi
  
  print_message "Pushing Docker image to ${REGISTRY}..." "${YELLOW}"
  docker push ${FULL_IMAGE_NAME}
  
  if [ $? -eq 0 ]; then
    print_success "Docker image pushed successfully!"
  else
    print_error "Failed to push Docker image!"
    exit 1
  fi
  
  # Logout for security
  docker logout ghcr.io
fi

# Print instructions for using the image with Roo
print_message "\nTo use this image with Roo, update your .roo/mcp.json file with:" "${GREEN}"
echo '{
  "mcpServers": {
    "maas-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "MAAS_API_URL",
        "-e",
        "MAAS_API_KEY",
        "'${FULL_IMAGE_NAME}'"
      ],
      "protocol": "stdio",
      "jsonrpc": "2.0",
      "readyMessage": "MCP server ready",
      "alwaysAllow": [
        "maas_list_machines",
        "maas_get_machine_details",
        "maas_allocate_machine",
        "maas_deploy_machine",
        "maas_release_machine",
        "maas_get_machine_power_state",
        "maas_power_on_machine",
        "maas_power_off_machine",
        "maas_list_subnets",
        "maas_get_subnet_details",
        "set_machine_storage_constraints",
        "get_machine_storage_constraints",
        "validate_machine_storage_constraints",
        "apply_machine_storage_constraints",
        "delete_machine_storage_constraints",
        "list_machines"
      ],
      "env": {
        "MAAS_API_URL": "http://your-maas-server:5240/MAAS",
        "MAAS_API_KEY": "your-maas-api-key"
      }
    }
  }
}'

print_success "Done!"