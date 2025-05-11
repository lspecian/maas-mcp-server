# MCP Inspector Testing Troubleshooting Guide

This document provides solutions for common issues that may arise during manual testing of the MAAS MCP Server using the MCP Inspector tool.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Authentication Issues](#authentication-issues)
- [Tool Execution Issues](#tool-execution-issues)
- [Resource Access Issues](#resource-access-issues)
- [Performance Issues](#performance-issues)
- [MCP Inspector Issues](#mcp-inspector-issues)

## Connection Issues

### Issue: Cannot Connect to MCP Server

**Symptoms:**
- MCP Inspector shows "Connection failed" error
- Unable to see available tools and resources

**Possible Causes and Solutions:**

1. **MCP Server is not running**
   - Check if the MAAS MCP Server is running with `npm run dev`
   - Verify the server started without errors in the console output

2. **Incorrect Server URL**
   - Ensure you're using the correct URL (typically `http://localhost:3000/mcp`)
   - Check if the port number matches the one in your `.env` file

3. **Network Firewall Blocking Connection**
   - Check if a firewall is blocking the connection
   - Try temporarily disabling the firewall for testing

4. **CORS Issues**
   - Check the server logs for CORS-related errors
   - Ensure the server is configured to allow requests from the MCP Inspector origin

### Issue: Connection Timeouts

**Symptoms:**
- Connection attempts time out
- Requests take a very long time to complete

**Possible Causes and Solutions:**

1. **Server Overloaded**
   - Check server resource usage (CPU, memory)
   - Restart the server if necessary

2. **Network Latency**
   - Check your network connection
   - Try connecting from a different network if possible

## Authentication Issues

### Issue: MAAS API Authentication Failures

**Symptoms:**
- Tools and resources return authentication errors
- Server logs show MAAS API authentication failures

**Possible Causes and Solutions:**

1. **Invalid MAAS API Key**
   - Check the MAAS API key in your `.env` file
   - Verify the key is valid by testing it directly with the MAAS API

2. **Expired MAAS API Key**
   - Generate a new MAAS API key from the MAAS web interface
   - Update the `.env` file with the new key

3. **Incorrect MAAS API URL**
   - Verify the MAAS API URL in your `.env` file
   - Ensure the URL includes the correct API version path (e.g., `/MAAS/api/2.0`)

## Tool Execution Issues

### Issue: Tool Returns Validation Error

**Symptoms:**
- Tool execution fails with validation error
- Error message mentions invalid parameters

**Possible Causes and Solutions:**

1. **Missing Required Parameters**
   - Check the tool documentation to identify required parameters
   - Ensure all required parameters are provided

2. **Invalid Parameter Values**
   - Verify parameter values match the expected format
   - Check for typos or incorrect data types

3. **Schema Validation Failure**
   - Review the error message for specific validation failures
   - Adjust parameter values to match the expected schema

### Issue: Tool Execution Hangs

**Symptoms:**
- Tool execution starts but never completes
- No error message is displayed

**Possible Causes and Solutions:**

1. **Long-Running Operation**
   - Some operations (like machine deployment) naturally take time
   - Check server logs to see if the operation is still in progress

2. **Server Process Stuck**
   - Restart the MAAS MCP Server
   - Check for error messages in the server logs

3. **Network Issues**
   - Check your network connection
   - Try cancelling the request and trying again

## Resource Access Issues

### Issue: Resource Not Found

**Symptoms:**
- Resource request returns 404 Not Found error
- Error message indicates resource doesn't exist

**Possible Causes and Solutions:**

1. **Incorrect Resource URI**
   - Check the URI format and ensure it's correct
   - Verify any IDs or parameters in the URI

2. **Resource Doesn't Exist**
   - Verify the resource exists in the MAAS instance
   - Use a tool to list available resources first

3. **URI Pattern Mismatch**
   - Check the resource URI pattern in the server code
   - Ensure your URI matches the expected pattern

## Performance Issues

### Issue: Slow Response Times

**Symptoms:**
- Tools and resources take a long time to respond
- MCP Inspector appears to freeze during requests

**Possible Causes and Solutions:**

1. **Large Data Sets**
   - Use pagination parameters (limit, offset) to reduce response size
   - Filter results to return only necessary data

2. **Server Performance Issues**
   - Check server resource usage
   - Consider running the server on a more powerful machine

3. **MAAS API Performance**
   - The underlying MAAS API might be slow
   - Check MAAS server performance

## MCP Inspector Issues

### Issue: MCP Inspector UI Problems

**Symptoms:**
- UI elements not rendering correctly
- Buttons not responding to clicks

**Possible Causes and Solutions:**

1. **Browser Compatibility**
   - Try a different browser (Chrome or Firefox recommended)
   - Update your browser to the latest version

2. **JavaScript Errors**
   - Check the browser console for JavaScript errors
   - Clear browser cache and reload

3. **Outdated MCP Inspector**
   - Update the MCP Inspector to the latest version:
     ```bash
     npm update -g @modelcontextprotocol/inspector
     ```

### Issue: Cannot Upload Files

**Symptoms:**
- File upload tools fail
- Error message about file size or format

**Possible Causes and Solutions:**

1. **File Too Large**
   - Reduce the file size
   - Check server configuration for maximum file size limits

2. **Unsupported File Format**
   - Ensure the file format is supported
   - Convert the file to a supported format

3. **Multipart Form Data Issues**
   - Check server logs for multipart form data parsing errors
   - Verify the MCP Inspector is correctly formatting the request

## Collecting Diagnostic Information

When reporting issues, collect the following information:

1. **Server Logs**
   - Capture the MAAS MCP Server console output
   - Set `LOG_LEVEL=debug` in `.env` for more detailed logs

2. **MCP Inspector Logs**
   - Open browser developer tools (F12)
   - Capture console output and network requests

3. **Environment Information**
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Operating system and version
   - Browser and version

4. **Request/Response Details**
   - The exact request parameters used
   - The response received (or error message)
   - Screenshots of the MCP Inspector during the issue

## Getting Help

If you encounter issues not covered in this guide:

1. Check the project's GitHub issues for similar problems
2. Review the server code related to the failing functionality
3. Consult the MCP specification for correct behavior
4. Contact the development team with the diagnostic information collected