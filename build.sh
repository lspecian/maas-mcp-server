#!/bin/bash

# Build script for MAAS MCP Server
# This script builds and runs the MAAS MCP Server with clean architecture

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

# Check if Go is installed
if ! command -v go &> /dev/null; then
  print_error "Go is not installed. Please install Go 1.22 or later."
  exit 1
fi

# Get Go version for information only
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
print_message "Using Go version $GO_VERSION" "${GREEN}"

# Validate MCP configuration
validate_mcp_config() {
  print_message "Validating MCP configuration..." "${YELLOW}"
  if [ -f "scripts/validate-mcp-config.js" ]; then
    node scripts/validate-mcp-config.js
    if [ $? -ne 0 ]; then
      print_error "MCP configuration validation failed!"
      exit 1
    fi
    print_success "MCP configuration validated successfully!"
  else
    print_warning "MCP configuration validator not found. Skipping validation."
  fi
}

# Build the server
build_server() {
  print_message "Building MAAS MCP Server..." "${YELLOW}"
  go build -o mcp-server cmd/server/main.go
  print_success "Build successful!"
}

# Build the MCP server
build_mcp_server() {
  print_message "Building MCP Server..." "${YELLOW}"
  go build -o maas-mcp-server cmd/server/main.go
  print_success "Build successful!"
}

# Build the MCP server for stdio mode
# Build the MCP server for stdio mode
build_mcp_stdio_server() {
  print_message "Building MCP Server for stdio mode..." "${YELLOW}"
  
  # Try to use Go 1.21.6 explicitly
  GO_1_21_6="/home/lspecian/.goenv/versions/1.21.6/bin/go"
  
  if [ -x "$GO_1_21_6" ]; then
    print_message "Using Go 1.21.6 to match dependencies..." "${YELLOW}"
    $GO_1_21_6 build -o maas-mcp-server pkg/mcp/cmd/main.go
  else
    print_message "Go 1.21.6 not found, using current Go version..." "${YELLOW}"
    go build -o maas-mcp-server pkg/mcp/cmd/main.go
  fi
  
  print_success "Build successful!"
}

# Run the server
run_server() {
  print_message "Running MAAS MCP Server..." "${YELLOW}"
  ./mcp-server
}

# Run the MCP server
run_mcp_server() {
  # Validate MCP configuration before running
  validate_mcp_config
  
  print_message "Running MCP Server..." "${YELLOW}"
  ./maas-mcp-server
}

# Run the MCP server in stdio mode
run_mcp_stdio() {
  # Validate MCP configuration before running
  validate_mcp_config
  
  print_message "Running MCP Server in stdio mode..." "${YELLOW}"
  
  # Start the MCP server directly with stdio
  ./maas-mcp-server stdio
}

# Run tests
run_tests() {
  print_message "Running tests..." "${YELLOW}"
  go test -v ./...
  print_success "Tests passed!"
}

# Run linter
run_lint() {
  print_message "Running linter..." "${YELLOW}"
  if ! command -v golangci-lint &> /dev/null; then
    print_warning "golangci-lint is not installed. Installing..."
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2
  fi
  golangci-lint run ./...
  print_success "Linting passed!"
}

# Show help
show_help() {
  echo "Usage: $0 [command]"
  echo
  echo "Commands:"
  echo "  build         Build the server"
  echo "  build-mcp     Build the MAAS MCP server with clean architecture"
  echo "  build-stdio   Build the MAAS MCP server for stdio mode"
  echo "  run           Build and run the server"
  echo "  run-mcp       Build and run the MAAS MCP server with clean architecture"
  echo "  run-mcp-stdio Build and run the MAAS MCP server in stdio mode"
  echo "  validate      Validate MCP configuration"
  echo "  test          Run tests"
  echo "  lint          Run linter"
  echo "  help          Show this help message"
  echo
}

# Main
case "$1" in
  build)
    build_server
    ;;
  build-mcp)
    build_mcp_server
    ;;
  build-stdio)
    build_mcp_stdio_server
    ;;
  run)
    build_server
    run_server
    ;;
  run-mcp)
    build_mcp_server
    run_mcp_server
    ;;
  run-mcp-stdio)
    build_mcp_stdio_server
    run_mcp_stdio
    ;;
  validate)
    validate_mcp_config
    ;;
  test)
    run_tests
    ;;
  lint)
    run_lint
    ;;
  help|*)
    show_help
    ;;
esac