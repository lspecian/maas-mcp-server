#!/bin/bash

# MAAS MCP Server - List Machines Runner Script
#
# This script installs the required dependencies and runs the list-machines.js script.
#
# Usage:
#   ./run-list-machines.sh [--mcp] [--port=3000]
#
# Options:
#   --mcp    Use the MCP protocol endpoint instead of the direct API endpoint
#   --port   Specify the port (default: 3000)

# Set script to exit on error
set -e

echo "MAAS MCP Server - List Machines Runner"
echo "======================================"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this script."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm to run this script."
    exit 1
fi

# Create a temporary directory for the script
TEMP_DIR=$(mktemp -d)
echo "Creating temporary directory: $TEMP_DIR"

# Copy the script files to the temporary directory
cp list-machines.js "$TEMP_DIR/"
cp list-machines-package.json "$TEMP_DIR/package.json"

# Change to the temporary directory
cd "$TEMP_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install --quiet

# Run the script with the provided arguments
echo "Running list-machines.js..."
node list-machines.js "$@"

# Clean up
echo "Cleaning up..."
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo "Done!"