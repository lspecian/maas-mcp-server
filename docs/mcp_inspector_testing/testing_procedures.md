# MCP Inspector Testing Procedures

This document outlines the step-by-step procedures for testing the MAAS MCP Server using the MCP Inspector tool. These procedures provide a structured approach to manual testing to ensure comprehensive coverage of the server's functionality.

## Table of Contents

- [General Testing Workflow](#general-testing-workflow)
- [Testing MCP Tools](#testing-mcp-tools)
- [Testing MCP Resources](#testing-mcp-resources)
- [Testing Error Handling](#testing-error-handling)
- [Testing AbortSignal Cancellation](#testing-abortsignal-cancellation)
- [Testing Edge Cases](#testing-edge-cases)
- [Documenting Test Results](#documenting-test-results)

## General Testing Workflow

### Prerequisites

Before starting the testing process:

1. Ensure the MCP Inspector testing environment is set up according to the [Setup Guide](setup_guide.md)
2. Make sure the MAAS MCP Server is running
3. Launch the MCP Inspector and connect to the server
4. Have the test scenarios document open for reference

### Testing Process Overview

The general workflow for testing each feature is:

1. **Preparation**: Identify the test case and understand its purpose
2. **Execution**: Perform the test steps using the MCP Inspector
3. **Verification**: Verify the actual results against the expected results
4. **Documentation**: Document the test results, including any issues found

## Testing MCP Tools

### Tool Testing Procedure

For each tool to be tested:

1. In the MCP Inspector, navigate to the "Tools" section
2. Select the tool to be tested
3. Enter the required parameters according to the test case
4. Click "Execute" to send the request
5. Observe the response and verify it matches the expected result
6. Document the test results, including screenshots if necessary

### Example: Testing the `maas_list_machines` Tool

1. Navigate to the "Tools" section in the MCP Inspector
2. Select the `maas_list_machines` tool
3. For the basic test, leave all parameters empty
4. Click "Execute"
5. Verify that the response contains a list of machines from the MAAS instance
6. Document the results, including:
   - Response status code
   - Response body structure
   - Any unexpected behavior

## Testing MCP Resources

### Resource Testing Procedure

For each resource to be tested:

1. In the MCP Inspector, navigate to the "Resources" section
2. Enter the URI for the resource to be tested, including any required parameters
3. Click "Execute" to send the request
4. Observe the response and verify it matches the expected result
5. Document the test results, including screenshots if necessary

### Example: Testing the Machine Details Resource

1. Navigate to the "Resources" section in the MCP Inspector
2. Enter the URI: `maas://machine/{system_id}/details` (replace `{system_id}` with a valid machine ID)
3. Click "Execute"
4. Verify that the response contains detailed information about the specified machine
5. Document the results, including:
   - Response status code
   - Response body structure
   - Any unexpected behavior

## Testing Error Handling

### Error Handling Testing Procedure

To test error handling:

1. Deliberately trigger error conditions according to the test case
2. Observe how the server responds to these conditions
3. Verify that appropriate error messages are returned
4. Check that the error response follows the expected format
5. Document the results, including screenshots if necessary

### Example: Testing Authentication Error

1. Modify the `.env` file to include an invalid MAAS API key
2. Restart the MAAS MCP Server
3. In the MCP Inspector, execute any tool or resource request
4. Verify that an authentication error is returned with an appropriate message
5. Document the results, including:
   - Error code
   - Error message
   - Any unexpected behavior

## Testing AbortSignal Cancellation

### AbortSignal Testing Procedure

To test request cancellation:

1. Start executing a tool or resource request that might take some time
2. Immediately click the "Cancel" button in the MCP Inspector
3. Observe how the server handles the cancellation
4. Verify that the request is properly cancelled and an appropriate message is returned
5. Document the results, including screenshots if necessary

## Testing Edge Cases

### Edge Case Testing Procedure

For testing edge cases:

1. Identify the edge case to be tested (e.g., large responses, special characters)
2. Set up the necessary conditions for the edge case
3. Execute the relevant tool or resource request
4. Observe how the server handles the edge case
5. Document the results, including screenshots if necessary

## Documenting Test Results

### Test Result Documentation Format

For each test case, document:

1. **Test ID**: The unique identifier for the test case
2. **Description**: Brief description of what was tested
3. **Steps Performed**: The actual steps taken during testing
4. **Expected Result**: What should have happened
5. **Actual Result**: What actually happened
6. **Status**: Pass, Fail, or Blocked
7. **Screenshots**: Visual evidence of the test results
8. **Notes**: Any additional observations or issues

### Example Test Result Documentation

```
Test ID: T-LM-01
Description: Verify that the listMachines tool returns all machines when called without parameters
Steps Performed:
1. Opened MCP Inspector
2. Navigated to Tools section
3. Selected "maas_list_machines" tool
4. Executed the tool without any parameters

Expected Result: Tool returns a JSON array containing all machines in the MAAS instance
Actual Result: Tool returned a JSON array with 5 machines, each containing system_id, hostname, status, and other expected fields
Status: Pass
Screenshots: [link to screenshot]
Notes: Response time was approximately 1.2 seconds
```

## Next Steps

After completing the testing procedures, refer to the [Test Scenarios](test_scenarios.md) document for specific test cases to execute.