# Troubleshooting Guide for MAAS MCP Server Testing

This guide provides solutions for common issues that might be encountered during testing of the MAAS MCP Server.

## Connection Issues

### MCP Inspector Cannot Connect to MAAS MCP Server

**Symptoms:**
- "Connection refused" error in MCP Inspector
- Timeout when trying to connect

**Possible Causes:**
1. MAAS MCP Server is not running
2. Server is running on a different port than expected
3. Firewall blocking the connection
4. Network configuration issue

**Solutions:**
1. Verify that the MAAS MCP Server is running:
   ```bash
   ps aux | grep maas-mcp-server
   ```
2. Check the server logs for any startup errors:
   ```bash
   cat logs/server.log
   ```
3. Verify the port configuration in the server's config file and ensure MCP Inspector is using the same port
4. Check firewall settings:
   ```bash
   sudo ufw status
   ```
5. Try connecting to the server using a simple HTTP client:
   ```bash
   curl http://localhost:<port>/health
   ```

### MAAS MCP Server Cannot Connect to MAAS API

**Symptoms:**
- Error messages in server logs about MAAS API connection
- Tools return errors about MAAS API being unavailable

**Possible Causes:**
1. MAAS API URL is incorrect
2. MAAS API key is invalid or expired
3. MAAS server is not running
4. Network connectivity issues

**Solutions:**
1. Verify the MAAS API URL in the server's config file
2. Check that the MAAS API key is valid:
   ```bash
   maas <profile> account
   ```
3. Ensure the MAAS server is running and accessible
4. Try connecting to the MAAS API directly:
   ```bash
   curl -H "Authorization: Bearer <api_key>" <maas_api_url>/machines
   ```

## Authentication Issues

### Invalid API Key

**Symptoms:**
- "Unauthorized" errors when making requests to MAAS API
- Error messages about authentication failure

**Solutions:**
1. Generate a new API key from the MAAS web UI
2. Update the API key in the server's config file
3. Restart the MAAS MCP Server

## Tool Execution Issues

### Tool Not Found

**Symptoms:**
- Error message: "Tool not found" when trying to execute a tool

**Possible Causes:**
1. Tool name is misspelled
2. Tool is not registered with the server

**Solutions:**
1. Check the tool name for typos
2. Verify that the tool is registered in the server's code
3. Check the server logs for any errors during tool registration

### Tool Execution Fails

**Symptoms:**
- Error message when executing a tool
- Tool execution hangs or times out

**Possible Causes:**
1. Invalid parameters
2. MAAS API error
3. Internal server error
4. Network issues

**Solutions:**
1. Check the parameters for correctness
2. Look at the server logs for detailed error messages
3. Try simplifying the request to isolate the issue
4. Check the MAAS API directly to see if it's responding correctly

## Progress Notification Issues

### Missing Progress Notifications

**Symptoms:**
- No progress notifications received for long-running operations
- Operation completes but no notifications are received

**Possible Causes:**
1. Progress token not provided
2. Notification handler not set up correctly
3. Server error during notification sending

**Solutions:**
1. Ensure a valid progress token is provided in the tool parameters
2. Check the server logs for errors related to notifications
3. Verify that the MCP Inspector is set up to receive notifications

### Incomplete Progress Notifications

**Symptoms:**
- Progress notifications start but stop before operation completes
- Final notification is missing

**Possible Causes:**
1. Operation failed silently
2. Server error during operation
3. Network issues

**Solutions:**
1. Check the server logs for errors
2. Verify the operation status in MAAS directly
3. Check for network interruptions

## Resource Retrieval Issues

### Resource Not Found

**Symptoms:**
- Error message: "Resource not found" when trying to access a resource

**Possible Causes:**
1. Resource URI is incorrect
2. Resource does not exist
3. Resource handler not registered

**Solutions:**
1. Check the resource URI for correctness
2. Verify that the resource exists in MAAS
3. Check the server logs for errors during resource handler registration

### Invalid Resource Format

**Symptoms:**
- Error parsing resource data
- Unexpected resource format

**Possible Causes:**
1. Resource handler returning incorrect format
2. MAAS API response format changed
3. Data transformation error

**Solutions:**
1. Check the resource handler code for format issues
2. Verify the MAAS API response format
3. Look for error messages in the server logs

## Performance Issues

### Slow Response Times

**Symptoms:**
- Tools take a long time to execute
- Resources take a long time to retrieve

**Possible Causes:**
1. MAAS API is slow
2. Server is overloaded
3. Network latency
4. Inefficient code

**Solutions:**
1. Check the MAAS API response times directly
2. Monitor server resource usage
3. Check network latency
4. Profile the server code to identify bottlenecks

### Memory Leaks

**Symptoms:**
- Server memory usage increases over time
- Server becomes unresponsive after running for a while

**Possible Causes:**
1. Memory leaks in the server code
2. Resource cleanup issues
3. Large response caching

**Solutions:**
1. Monitor server memory usage
2. Check for resource cleanup in the code
3. Restart the server regularly
4. Implement memory usage logging

## Test Environment Issues

### MAAS Instance Not Ready

**Symptoms:**
- Tests fail because MAAS instance is not in the expected state
- Machine operations fail

**Possible Causes:**
1. MAAS instance not properly set up
2. Machines not in the expected state
3. Required resources missing

**Solutions:**
1. Verify the MAAS instance setup
2. Check machine states in MAAS
3. Create required resources (tags, subnets, etc.)

### Test Data Conflicts

**Symptoms:**
- Tests interfere with each other
- Unexpected state changes

**Possible Causes:**
1. Tests modifying shared resources
2. Tests not cleaning up after themselves
3. Concurrent test execution

**Solutions:**
1. Isolate test resources
2. Implement proper cleanup in tests
3. Run tests sequentially
4. Use unique identifiers for test resources

## Debugging Techniques

### Enable Debug Logging

To get more detailed information about what's happening in the server:

```bash
# Set log level to debug in the config file
export LOG_LEVEL=debug

# Restart the server
npm restart
```

### Inspect Network Traffic

To see the actual requests and responses:

```bash
# Using tcpdump
sudo tcpdump -i lo -A -s 0 'port <server_port>'

# Using wireshark
sudo wireshark -i lo -f 'port <server_port>'
```

### Monitor Server Process

To monitor the server process in real-time:

```bash
# Using top
top -p $(pgrep -f maas-mcp-server)

# Using htop
htop -p $(pgrep -f maas-mcp-server)
```

### Check MAAS API Directly

To verify if the issue is with MAAS or the MCP Server:

```bash
# Get machines
maas <profile> machines read

# Get a specific machine
maas <profile> machine read <system_id>

# Deploy a machine
maas <profile> machine deploy <system_id>
```

## Common Error Messages and Solutions

| Error Message | Possible Cause | Solution |
|---------------|----------------|----------|
| "MAAS API Error: 401 Unauthorized" | Invalid API key | Generate a new API key and update the config |
| "MAAS API Error: 404 Not Found" | Resource does not exist | Verify the resource exists in MAAS |
| "Validation Error: Required parameter missing" | Missing required parameter | Check the tool parameters |
| "Internal Server Error" | Server code error | Check the server logs for details |
| "Operation Aborted" | Operation was manually aborted or timed out | Check for timeout settings or manual abort |
| "Connection refused" | Server not running or wrong port | Verify server is running and port is correct |

## Getting Help

If you encounter an issue not covered in this guide:

1. Check the server logs for detailed error messages
2. Search the project issues on GitHub
3. Consult the project documentation
4. Reach out to the development team