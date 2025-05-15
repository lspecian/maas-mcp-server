# HTML Tests Directory

This directory contains HTML-based tests for the MAAS MCP Server project.

## Contents

- `test-sse.html` - A test for Server-Sent Events (SSE) functionality

## Purpose

These HTML files provide browser-based tests for features that require a browser environment, such as Server-Sent Events (SSE). They allow for manual testing of browser-specific functionality and can be used to verify that the server correctly implements browser-compatible protocols.

## Usage

To use these tests, open the HTML files in a web browser while the MCP server is running. The tests will connect to the server and perform the specified tests.

Example:
```bash
# Start the MCP server
./bin/mcp-server-clean

# Open the SSE test in a browser
open test/html/test-sse.html
```

## Server-Sent Events Test

The `test-sse.html` file tests the server's implementation of Server-Sent Events (SSE), which allows the server to push updates to the client over a single HTTP connection. This is useful for real-time updates and notifications.