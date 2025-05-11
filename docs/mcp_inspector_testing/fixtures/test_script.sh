#!/bin/bash
# Test script for MCP Inspector testing
# This script can be used with the maas_upload_script tool

echo "MAAS MCP Server Test Script"
echo "Running system checks..."

# Print system information
echo "Hostname: $(hostname)"
echo "Kernel: $(uname -r)"
echo "Architecture: $(uname -m)"

# Check CPU info
echo "CPU Information:"
lscpu | grep "Model name" || echo "CPU info not available"

# Check memory
echo "Memory Information:"
free -h || echo "Memory info not available"

# Check disk space
echo "Disk Space Information:"
df -h / || echo "Disk info not available"

echo "System check completed."
exit 0