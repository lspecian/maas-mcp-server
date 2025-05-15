#!/bin/bash

# Build script for MAAS MCP Server release binaries
# This script builds binaries for multiple platforms and architectures

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

# Get version from version.go
VERSION=$(grep -o 'Version = "[^"]*"' internal/version/version.go | cut -d'"' -f2)
print_message "Building release binaries for version ${VERSION}..." "${YELLOW}"

# Create release directory
RELEASE_DIR="release/v${VERSION}"
mkdir -p ${RELEASE_DIR}

# Platforms to build for
PLATFORMS=(
  "linux/amd64"
  "linux/arm64"
  "darwin/amd64"
  "darwin/arm64"
  "windows/amd64"
)

# Build binaries for each platform
for PLATFORM in "${PLATFORMS[@]}"; do
  # Split platform into OS and ARCH
  OS=$(echo ${PLATFORM} | cut -d'/' -f1)
  ARCH=$(echo ${PLATFORM} | cut -d'/' -f2)
  
  # Set output binary name
  if [ "${OS}" = "windows" ]; then
    OUTPUT_NAME="maas-mcp-server_${VERSION}_${OS}_${ARCH}.exe"
  else
    OUTPUT_NAME="maas-mcp-server_${VERSION}_${OS}_${ARCH}"
  fi
  
  OUTPUT_PATH="${RELEASE_DIR}/${OUTPUT_NAME}"
  
  print_message "Building for ${OS}/${ARCH}..." "${YELLOW}"
  
  # Build the binary
  GOOS=${OS} GOARCH=${ARCH} go build -o ${OUTPUT_PATH} cmd/server/main.go
  
  if [ $? -eq 0 ]; then
    print_success "Successfully built binary for ${OS}/${ARCH}"
    
    # Create archive
    if [ "${OS}" = "windows" ]; then
      # Create zip for Windows
      zip -j "${RELEASE_DIR}/maas-mcp-server_${VERSION}_${OS}_${ARCH}.zip" "${OUTPUT_PATH}"
      print_success "Created zip archive for ${OS}/${ARCH}"
    else
      # Create tar.gz for Linux and macOS
      tar -czf "${RELEASE_DIR}/maas-mcp-server_${VERSION}_${OS}_${ARCH}.tar.gz" -C "${RELEASE_DIR}" "${OUTPUT_NAME}"
      print_success "Created tar.gz archive for ${OS}/${ARCH}"
    fi
  else
    print_error "Failed to build binary for ${OS}/${ARCH}"
  fi
done

# Create checksums
print_message "Generating checksums..." "${YELLOW}"
cd ${RELEASE_DIR}
shasum -a 256 *.zip *.tar.gz > checksums.txt
cd -

print_success "Release binaries built successfully in ${RELEASE_DIR}"
print_message "You can now upload these binaries to the GitHub release." "${GREEN}"