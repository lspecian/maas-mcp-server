#!/bin/bash
# Setup script for MCP Inspector testing environment

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js v18.0.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR_VERSION -lt 18 ]; then
    echo "Error: Node.js version $NODE_VERSION is not supported. Please install Node.js v18.0.0 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm v8.0.0 or higher."
    exit 1
fi

echo "Setting up MCP Inspector testing environment..."

# Install MCP Inspector globally
echo "Installing MCP Inspector..."
npm install -g @modelcontextprotocol/inspector

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please edit the .env file with your MAAS API credentials."
fi

# Create test data directory if it doesn't exist
if [ ! -d test-data ]; then
    echo "Creating test data directory..."
    mkdir -p test-data
    cp docs/mcp_inspector_testing/fixtures/mock_data.json test-data/
fi

echo "MCP Inspector testing environment setup complete!"
echo ""
echo "To start the MAAS MCP Server:"
echo "  npm run dev"
echo ""
echo "To launch the MCP Inspector:"
echo "  npm run inspector"
echo ""
echo "For more information, see the documentation in docs/mcp_inspector_testing/"