# Manual Test Scenarios for MCP Inspector

This document outlines manual test scenarios to verify the functionality of the MAAS MCP Server using the MCP Inspector tool.

## Setup

1. Ensure MCP Inspector is installed and configured according to the [setup guide](./setup_guide.md)
2. Start the MAAS MCP Server
3. Connect MCP Inspector to the server

## Test Scenarios

### 1. Machine Listing and Filtering

#### 1.1 List All Machines

**Steps:**
1. Use the MCP Inspector to call the `maas_list_machines` tool without any parameters
2. Verify that a list of machines is returned
3. Check that the response format is correct (resource type with proper URI)

**Expected Result:**
- A list of all machines in the MAAS instance
- Each machine should have system_id, hostname, status, and other basic properties
- No errors should be reported

#### 1.2 Filter Machines by Status

**Steps:**
1. Use the MCP Inspector to call the `maas_list_machines` tool with the parameter `status=Ready`
2. Verify that only machines with status "Ready" are returned

**Expected Result:**
- Only machines with status "Ready" are returned
- The response format is correct
- No errors should be reported

#### 1.3 Filter Machines by Tags

**Steps:**
1. Use the MCP Inspector to call the `maas_list_machines` tool with the parameter `tags=["tag1", "tag2"]`
2. Verify that only machines with both tags are returned

**Expected Result:**
- Only machines with both "tag1" and "tag2" are returned
- The response format is correct
- No errors should be reported

### 2. Machine Deployment

#### 2.1 Deploy Machine

**Steps:**
1. Use the MCP Inspector to call the `maas_deploy_machine` tool with a valid system_id
2. Verify that the deployment starts
3. Check that the response indicates success

**Expected Result:**
- The deployment starts successfully
- The response includes the system_id and status
- No errors should be reported

#### 2.2 Deploy Machine with Progress

**Steps:**
1. Use the MCP Inspector to call the `maas_deploy_machine_with_progress` tool with a valid system_id and a progress token
2. Verify that progress notifications are received
3. Wait for the deployment to complete
4. Check that the final notification indicates success

**Expected Result:**
- Progress notifications are received at regular intervals
- The final notification indicates successful deployment
- The machine status changes to "Deployed"
- No errors should be reported

#### 2.3 Deploy Machine with Invalid Parameters

**Steps:**
1. Use the MCP Inspector to call the `maas_deploy_machine` tool with an invalid system_id
2. Verify that an appropriate error is returned

**Expected Result:**
- An error response is returned
- The error message clearly indicates the issue (invalid system_id)
- The error type is appropriate (e.g., NOT_FOUND)

### 3. Machine Commissioning

#### 3.1 Commission Machine

**Steps:**
1. Use the MCP Inspector to call the `maas_commission_machine_with_progress` tool with a valid system_id and a progress token
2. Verify that progress notifications are received
3. Wait for the commissioning to complete
4. Check that the final notification indicates success

**Expected Result:**
- Progress notifications are received at regular intervals
- The final notification indicates successful commissioning
- The machine status changes to "Ready"
- No errors should be reported

### 4. Tag Management

#### 4.1 Create Tag

**Steps:**
1. Use the MCP Inspector to call the `maas_create_tag` tool with a new tag name and comment
2. Verify that the tag is created
3. Check that the response includes the tag details

**Expected Result:**
- The tag is created successfully
- The response includes the tag name, comment, and other properties
- No errors should be reported

#### 4.2 Add Tag to Machine

**Steps:**
1. Use the MCP Inspector to call the `maas_tag_machine` tool with a valid system_id and tag name
2. Verify that the tag is added to the machine
3. Check that the response indicates success

**Expected Result:**
- The tag is added to the machine successfully
- The response indicates success
- No errors should be reported

### 5. Network Configuration

#### 5.1 List Subnets

**Steps:**
1. Use the MCP Inspector to call the `maas_list_subnets` tool without any parameters
2. Verify that a list of subnets is returned
3. Check that the response format is correct

**Expected Result:**
- A list of all subnets in the MAAS instance
- Each subnet should have CIDR, name, and other basic properties
- No errors should be reported

#### 5.2 Filter Subnets by CIDR

**Steps:**
1. Use the MCP Inspector to call the `maas_list_subnets` tool with the parameter `cidr=192.168.1.0/24`
2. Verify that only subnets matching the CIDR are returned

**Expected Result:**
- Only subnets with CIDR "192.168.1.0/24" are returned
- The response format is correct
- No errors should be reported

### 6. Error Handling

#### 6.1 Invalid Tool Name

**Steps:**
1. Use the MCP Inspector to call a non-existent tool (e.g., `maas_nonexistent_tool`)
2. Verify that an appropriate error is returned

**Expected Result:**
- An error response is returned
- The error message clearly indicates the issue (tool not found)
- The error type is appropriate (e.g., NOT_FOUND)

#### 6.2 Missing Required Parameters

**Steps:**
1. Use the MCP Inspector to call the `maas_deploy_machine` tool without providing the required system_id parameter
2. Verify that an appropriate error is returned

**Expected Result:**
- An error response is returned
- The error message clearly indicates the issue (missing required parameter)
- The error type is appropriate (e.g., VALIDATION)

#### 6.3 Invalid Parameter Types

**Steps:**
1. Use the MCP Inspector to call the `maas_list_machines` tool with an invalid parameter type (e.g., `status=123` instead of a string)
2. Verify that an appropriate error is returned

**Expected Result:**
- An error response is returned
- The error message clearly indicates the issue (invalid parameter type)
- The error type is appropriate (e.g., VALIDATION)

### 7. Resource Retrieval

#### 7.1 Get Machine Details

**Steps:**
1. Use the MCP Inspector to access the resource `maas://machine/{system_id}/details.json`
2. Verify that the machine details are returned
3. Check that the response format is correct

**Expected Result:**
- The machine details are returned
- The response includes all machine properties
- No errors should be reported

#### 7.2 Get Subnet Details

**Steps:**
1. Use the MCP Inspector to access the resource `maas://subnet/{id}/details.json`
2. Verify that the subnet details are returned
3. Check that the response format is correct

**Expected Result:**
- The subnet details are returned
- The response includes all subnet properties
- No errors should be reported

### 8. Long-Running Operations

#### 8.1 Abort Long-Running Operation

**Steps:**
1. Use the MCP Inspector to call the `maas_deploy_machine_with_progress` tool with a valid system_id and a progress token
2. Wait for the deployment to start
3. Abort the operation using the MCP Inspector
4. Verify that the operation is aborted and an appropriate notification is received

**Expected Result:**
- The operation is aborted
- A notification is received indicating that the operation was aborted
- The machine status is appropriate (e.g., not "Deploying")
- No unexpected errors should be reported

## Test Results

Document the results of each test scenario in the [test report template](./test_report_template.md).