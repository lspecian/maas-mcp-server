#!/bin/bash

# MAAS MCP Server - All-in-One Script
#
# This script provides a unified interface for setting up, starting, and testing the MAAS MCP Server.
#
# Usage:
#   ./maas-mcp-server.sh [command] [options]
#
# Commands:
#   setup       Set up the environment variables
#   start       Start the server
#   test        Test the server
#   help        Show this help message
#
# Options:
#   --dev       Run in development mode (for start command)
#   --prod      Run in production mode (for start command)
#   --mcp       Use MCP protocol for testing (for test command)
#   --port=N    Specify port number (for start and test commands)
#   --defaults  Use default values for setup

# Set script to exit on error
set -e

# Display help message
show_help() {
  echo "MAAS MCP Server - All-in-One Script"
  echo "==================================="
  echo
  echo "Usage:"
  echo "  ./maas-mcp-server.sh [command] [options]"
  echo
  echo "Commands:"
  echo "  setup       Set up the environment variables"
  echo "  start       Start the server"
  echo "  test        Test the server"
  echo "  help        Show this help message"
  echo
  echo "Options:"
  echo "  --dev       Run in development mode (for start command)"
  echo "  --prod      Run in production mode (for start command)"
  echo "  --mcp       Use MCP protocol for testing (for test command)"
  echo "  --port=N    Specify port number (for start and test commands)"
  echo "  --defaults  Use default values for setup"
  echo
  echo "Examples:"
  echo "  ./maas-mcp-server.sh setup"
  echo "  ./maas-mcp-server.sh setup --defaults"
  echo "  ./maas-mcp-server.sh start --dev"
  echo "  ./maas-mcp-server.sh start --prod --port=3001"
  echo "  ./maas-mcp-server.sh test"
  echo "  ./maas-mcp-server.sh test --mcp --port=3001"
}

# Setup command
setup_command() {
  echo "Setting up MAAS MCP Server environment..."
  
  # Check if setup-env.sh exists
  if [ ! -f "./setup-env.sh" ]; then
    echo "Error: setup-env.sh script not found."
    exit 1
  fi
  
  # Make sure it's executable
  chmod +x ./setup-env.sh
  
  # Run setup script with any provided options
  ./setup-env.sh "$@"
}

# Start command
start_command() {
  echo "Starting MAAS MCP Server..."
  
  # Parse options
  local mode="dev"
  local port=""
  
  for arg in "$@"; do
    case $arg in
      --dev)
        mode="dev"
        ;;
      --prod)
        mode="prod"
        ;;
      --port=*)
        port="${arg#*=}"
        ;;
    esac
  done
  
  # Set port if specified
  if [ -n "$port" ]; then
    export MCP_PORT="$port"
    echo "Using port: $port"
  fi
  
  # Start server in appropriate mode
  if [ "$mode" == "dev" ]; then
    echo "Starting in development mode..."
    npm run dev
  else
    echo "Starting in production mode..."
    npm run build && npm start
  fi
}

# Test command
test_command() {
  echo "Testing MAAS MCP Server..."
  
  # Check if run-list-machines.sh exists
  if [ ! -f "./run-list-machines.sh" ]; then
    echo "Error: run-list-machines.sh script not found."
    exit 1
  fi
  
  # Make sure it's executable
  chmod +x ./run-list-machines.sh
  
  # Run test script with any provided options
  ./run-list-machines.sh "$@"
}

# Main script logic
if [ $# -eq 0 ]; then
  show_help
  exit 0
fi

# Parse command
command="$1"
shift

case $command in
  setup)
    setup_command "$@"
    ;;
  start)
    start_command "$@"
    ;;
  test)
    test_command "$@"
    ;;
  help)
    show_help
    ;;
  *)
    echo "Error: Unknown command '$command'"
    show_help
    exit 1
    ;;
esac