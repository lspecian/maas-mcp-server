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

# Check Go version
GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
GO_MAJOR=$(echo $GO_VERSION | cut -d. -f1)
GO_MINOR=$(echo $GO_VERSION | cut -d. -f2)

if [ "$GO_MAJOR" -lt 1 ] || ([ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -lt 22 ]); then
  print_warning "Go version $GO_VERSION detected. This project requires Go 1.22 or later."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build the server
build_server() {
  print_message "Building MAAS MCP Server..." "${YELLOW}"
  go build -o mcp-server cmd/server/main.go
  print_success "Build successful!"
}

# Build the MCP server
build_mcp_server() {
  print_message "Building MCP Server..." "${YELLOW}"
  go build -o mcp-server-clean pkg/mcp/cmd/main.go
  print_success "Build successful!"
}

# Run the server
run_server() {
  print_message "Running MAAS MCP Server..." "${YELLOW}"
  ./mcp-server
}

# Run the MCP server
run_mcp_server() {
  print_message "Running MCP Server..." "${YELLOW}"
  ./mcp-server-clean
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
  echo "  build-mcp     Build the MCP server with clean architecture"
  echo "  run           Build and run the server"
  echo "  run-mcp       Build and run the MCP server with clean architecture"
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
  run)
    build_server
    run_server
    ;;
  run-mcp)
    build_mcp_server
    run_mcp_server
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