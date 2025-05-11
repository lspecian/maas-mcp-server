# Manual Testing Plan for MCP Tools and Resources

## 1. Introduction

This document outlines the manual testing plan for the MAAS MCP Server's tools and resources. The testing will be performed using the MCP Inspector or a similar MCP client to verify the functionality, error handling, and cancellation capabilities of the implemented MCP components.

## 2. Test Environment Setup

### 2.1 Prerequisites

- MAAS MCP Server running locally
- MCP Inspector or similar MCP client tool
- Access to a MAAS instance with:
  - At least 3 machines registered
  - At least 2 subnets configured
  - Appropriate permissions to create tags

### 2.2 Environment Configuration

1. Clone the MAAS MCP Server repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with appropriate MAAS API credentials
   ```
4. Start the MCP server:
   ```bash
   npm start
   ```
5. Launch the MCP Inspector and connect to the local MCP server

### 2.3 Test Data Preparation

- Identify specific machine IDs to use for testing
- Identify specific subnet IDs to use for testing
- Prepare tag names and definitions for testing tag creation

## 3. MCP Tools Testing

### 3.1 List Machines Tool

#### Test Case T-LM-01: List All Machines

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-01 |
| Description | Verify that the listMachines tool returns all machines when called without parameters |
| Prerequisites | MAAS instance with at least 3 machines registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns a JSON array containing all machines in the MAAS instance |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-02: Filter Machines by Hostname

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-02 |
| Description | Verify that the listMachines tool correctly filters machines by hostname |
| Prerequisites | MAAS instance with machines having different hostnames |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set the "hostname" parameter to a known partial hostname<br>5. Execute the tool |
| Expected Result | Tool returns only machines whose hostnames contain the specified string |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-03: Filter Machines by Status

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-03 |
| Description | Verify that the listMachines tool correctly filters machines by status |
| Prerequisites | MAAS instance with machines in different states |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set the "status" parameter to "ready"<br>5. Execute the tool |
| Expected Result | Tool returns only machines with "Ready" status |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-04: Filter Machines by Tags

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-04 |
| Description | Verify that the listMachines tool correctly filters machines by tags |
| Prerequisites | MAAS instance with machines having different tags |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set the "tag_names" parameter to ["tag1", "tag2"]<br>5. Execute the tool |
| Expected Result | Tool returns only machines that have both specified tags |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-05: Pagination with Limit and Offset

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-05 |
| Description | Verify that the listMachines tool correctly implements pagination |
| Prerequisites | MAAS instance with at least 5 machines |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set "limit" to 2 and "offset" to 0<br>5. Execute the tool<br>6. Note the results<br>7. Set "offset" to 2<br>8. Execute the tool again |
| Expected Result | First execution returns the first 2 machines, second execution returns the next 2 machines |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-06: Cancel Request with AbortSignal

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-06 |
| Description | Verify that the listMachines tool handles request cancellation |
| Prerequisites | MAAS instance with machines registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Start executing the tool<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | The request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LM-07: Invalid Parameters Handling

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LM-07 |
| Description | Verify that the listMachines tool properly handles invalid parameters |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set "limit" to -1<br>5. Execute the tool |
| Expected Result | Tool returns an appropriate error message about invalid parameters |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 3.2 Create Tag Tool

#### Test Case T-CT-01: Create Simple Tag

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-01 |
| Description | Verify that the createTag tool can create a basic tag |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-1"<br>5. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-02: Create Tag with Comment

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-02 |
| Description | Verify that the createTag tool can create a tag with a comment |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-2"<br>5. Set "comment" parameter to "Test tag created via MCP Inspector"<br>6. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name and comment |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-03: Create Tag with Definition

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-03 |
| Description | Verify that the createTag tool can create a tag with a definition |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-3"<br>5. Set "definition" parameter to "//node[@cpu_count > 4]"<br>6. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name and definition |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-04: Create Tag with Kernel Options

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-04 |
| Description | Verify that the createTag tool can create a tag with kernel options |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-4"<br>5. Set "kernel_opts" parameter to "console=tty0 console=ttyS0,115200n8"<br>6. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name and kernel options |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-05: Create Tag with All Parameters

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-05 |
| Description | Verify that the createTag tool can create a tag with all parameters |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-5"<br>5. Set "comment" parameter to "Comprehensive test tag"<br>6. Set "definition" parameter to "//node[@cpu_count > 2]"<br>7. Set "kernel_opts" parameter to "console=tty0"<br>8. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with all specified parameters |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-06: Create Duplicate Tag

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-06 |
| Description | Verify that the createTag tool handles duplicate tag creation attempts |
| Prerequisites | MAAS instance with a tag named "existing-tag" already created |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "existing-tag"<br>5. Execute the tool |
| Expected Result | Tool returns an error indicating that the tag already exists |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-CT-07: Create Tag with Invalid Definition

| Attribute | Description |
|-----------|-------------|
| Test ID | T-CT-07 |
| Description | Verify that the createTag tool handles invalid tag definitions |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "invalid-def-tag"<br>5. Set "definition" parameter to "invalid xpath expression"<br>6. Execute the tool |
| Expected Result | Tool returns an error indicating that the definition is invalid |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 3.3 List Subnets Tool

#### Test Case T-LS-01: List All Subnets

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-01 |
| Description | Verify that the listSubnets tool returns all subnets when called without parameters |
| Prerequisites | MAAS instance with at least 2 subnets configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns a JSON array containing all subnets in the MAAS instance |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LS-02: Filter Subnets by CIDR

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-02 |
| Description | Verify that the listSubnets tool correctly filters subnets by CIDR |
| Prerequisites | MAAS instance with subnets having different CIDRs |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Set the "cidr" parameter to a known CIDR (e.g., "192.168.1.0/24")<br>5. Execute the tool |
| Expected Result | Tool returns only subnets matching the specified CIDR |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LS-03: Filter Subnets by Name

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-03 |
| Description | Verify that the listSubnets tool correctly filters subnets by name |
| Prerequisites | MAAS instance with subnets having different names |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Set the "name" parameter to a known subnet name<br>5. Execute the tool |
| Expected Result | Tool returns only subnets with the specified name |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LS-04: Filter Subnets by VLAN

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-04 |
| Description | Verify that the listSubnets tool correctly filters subnets by VLAN |
| Prerequisites | MAAS instance with subnets on different VLANs |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Set the "vlan" parameter to a known VLAN ID<br>5. Execute the tool |
| Expected Result | Tool returns only subnets on the specified VLAN |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LS-05: Pagination with Limit and Offset

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-05 |
| Description | Verify that the listSubnets tool correctly implements pagination |
| Prerequisites | MAAS instance with at least 4 subnets |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Set "limit" to 2 and "offset" to 0<br>5. Execute the tool<br>6. Note the results<br>7. Set "offset" to 2<br>8. Execute the tool again |
| Expected Result | First execution returns the first 2 subnets, second execution returns the next 2 subnets |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case T-LS-06: Cancel Request with AbortSignal

| Attribute | Description |
|-----------|-------------|
| Test ID | T-LS-06 |
| Description | Verify that the listSubnets tool handles request cancellation |
| Prerequisites | MAAS instance with subnets configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Start executing the tool<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | The request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

## 4. MCP Resources Testing

### 4.1 Machine Details Resource

#### Test Case R-MD-01: Fetch Valid Machine Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MD-01 |
| Description | Verify that the machineDetails resource returns correct information for a valid machine ID |
| Prerequisites | MAAS instance with at least one machine registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine/{system_id}/details" with a valid system_id<br>4. Execute the resource request |
| Expected Result | Resource returns a JSON object containing detailed information about the specified machine |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-MD-02: Fetch Non-existent Machine Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MD-02 |
| Description | Verify that the machineDetails resource handles requests for non-existent machines |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine/nonexistent-id/details"<br>4. Execute the resource request |
| Expected Result | Resource returns an appropriate error message indicating the machine was not found |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-MD-03: Fetch Machine Details with Empty System ID

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MD-03 |
| Description | Verify that the machineDetails resource handles requests with empty system ID |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine//details"<br>4. Execute the resource request |
| Expected Result | Resource returns an error indicating that the system ID is missing |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-MD-04: Cancel Machine Details Request

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MD-04 |
| Description | Verify that the machineDetails resource handles request cancellation |
| Prerequisites | MAAS instance with at least one machine registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine/{system_id}/details" with a valid system_id<br>4. Start executing the resource request<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | The request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 4.2 Subnet Details Resource

#### Test Case R-SD-01: Fetch Valid Subnet Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-SD-01 |
| Description | Verify that the subnetDetails resource returns correct information for a valid subnet ID |
| Prerequisites | MAAS instance with at least one subnet configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://subnet/{subnet_id}/details" with a valid subnet_id<br>4. Execute the resource request |
| Expected Result | Resource returns a JSON object containing detailed information about the specified subnet |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-SD-02: Fetch Non-existent Subnet Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-SD-02 |
| Description | Verify that the subnetDetails resource handles requests for non-existent subnets |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://subnet/999/details" (assuming 999 is a non-existent subnet ID)<br>4. Execute the resource request |
| Expected Result | Resource returns an appropriate error message indicating the subnet was not found |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-SD-03: Fetch Subnet Details with Empty Subnet ID

| Attribute | Description |
|-----------|-------------|
| Test ID | R-SD-03 |
| Description | Verify that the subnetDetails resource handles requests with empty subnet ID |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://subnet//details"<br>4. Execute the resource request |
| Expected Result | Resource returns an error indicating that the subnet ID is missing |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

#### Test Case R-SD-04: Cancel Subnet Details Request

| Attribute | Description |
|-----------|-------------|
| Test ID | R-SD-04 |
| Description | Verify that the subnetDetails resource handles request cancellation |
| Prerequisites | MAAS instance with at least one subnet configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://subnet/{subnet_id}/details" with a valid subnet_id<br>4. Start executing the resource request<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | The request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

## 5. Error Handling Testing

### 5.1 API Connection Errors

#### Test Case E-AC-01: MAAS API Unavailable

| Attribute | Description |
|-----------|-------------|
| Test ID | E-AC-01 |
| Description | Verify that MCP tools and resources handle MAAS API unavailability gracefully |
| Prerequisites | MCP server configured with incorrect MAAS API URL or credentials |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns an appropriate error message indicating connection failure |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 5.2 Authentication Errors

#### Test Case E-AE-01: Invalid API Key

| Attribute | Description |
|-----------|-------------|
| Test ID | E-AE-01 |
| Description | Verify that MCP tools and resources handle authentication failures gracefully |
| Prerequisites | MCP server configured with invalid MAAS API key |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns an appropriate error message indicating authentication failure |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 5.3 Permission Errors

#### Test Case E-PE-01: Insufficient Permissions

| Attribute | Description |
|-----------|-------------|
| Test ID | E-PE-01 |
| Description | Verify that MCP tools handle permission errors gracefully |
| Prerequisites | MCP server configured with MAAS API credentials that have read-only permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag"<br>5. Execute the tool |
| Expected Result | Tool returns an appropriate error message indicating insufficient permissions |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

## 6. AbortSignal Cancellation Testing

### 6.1 Tool Cancellation

#### Test Case A-TC-01: Cancel Long-Running Tool

| Attribute | Description |
|-----------|-------------|
| Test ID | A-TC-01 |
| Description | Verify that all tools properly handle AbortSignal cancellation |
| Prerequisites | MAAS instance with many machines (or simulated network delay) |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select each tool in turn<br>4. Start executing the tool<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | Each tool's request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 6.2 Resource Cancellation

#### Test Case A-RC-01: Cancel Long-Running Resource Request

| Attribute | Description |
|-----------|-------------|
| Test ID | A-RC-01 |
| Description | Verify that all resources properly handle AbortSignal cancellation |
| Prerequisites | MAAS instance with configured machines and subnets (or simulated network delay) |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. For each resource, enter the appropriate URI with valid parameters<br>4. Start executing the resource request<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | Each resource request is cancelled, and an appropriate error message is returned |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

## 7. Edge Cases Testing

### 7.1 Large Response Handling

#### Test Case EC-LR-01: List Many Machines

| Attribute | Description |
|-----------|-------------|
| Test ID | EC-LR-01 |
| Description | Verify that the listMachines tool can handle large responses |
| Prerequisites | MAAS instance with many machines (50+) |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool successfully returns all machines without timing out or crashing |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

### 7.2 Special Characters Handling

#### Test Case EC-SC-01: Create Tag with Special Characters

| Attribute | Description |
|-----------|-------------|
| Test ID | EC-SC-01 |
| Description | Verify that the createTag tool handles special characters in tag names and comments |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-special-!@#"<br>5. Set "comment" parameter to "Comment with special chars: !@#$%^&*()"<br>6. Execute the tool |
| Expected Result | Tool handles special characters appropriately (either by creating the tag or returning a clear error message) |
| Actual Result | *To be filled during testing* |
| Screenshots | *To be added during testing* |

## 8. Testing Summary

### 8.1 Test Results Overview

| Category | Total Tests | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| List Machines Tool | 7 | *TBD* | *TBD* | *TBD* |
| Create Tag Tool | 7 | *TBD* | *TBD* | *TBD* |
| List Subnets Tool | 6 | *TBD* | *TBD* | *TBD* |
| Machine Details Resource | 4 | *TBD* | *TBD* | *TBD* |
| Subnet Details Resource | 4 | *TBD* | *TBD* | *TBD* |
| Error Handling | 3 | *TBD* | *TBD* | *TBD* |
| AbortSignal Cancellation | 2 | *TBD* | *TBD* | *TBD* |
| Edge Cases | 2 | *TBD* | *TBD* | *TBD* |
| **Total** | **35** | **TBD** | **TBD** | **TBD** |

### 8.2 Issues Found

*To be filled during testing*

### 8.3 Recommendations

*To be filled during testing*

## 9. Appendix

### 9.1 MCP Inspector Setup

1. Install MCP Inspector:
   ```bash
   npm install -g mcp-inspector
   ```

2. Launch MCP Inspector:
   ```bash
   mcp-inspector
   ```

3. Connect to the local MCP server:
   - Server URL: `http://localhost:3000/mcp`
   - Click "Connect"

### 9.2 Example API Responses

#### Example Machine Response

```json
{
  "system_id": "abc123",
  "hostname": "test-machine-1",
  "domain": { "id": 1, "name": "maas" },
  "architecture": "amd64/generic",
  "status": 4,
  "status_name": "Ready",
  "owner": "admin",
  "owner_data": { "key": "value" },
  "ip_addresses": ["192.168.1.100"],
  "cpu_count": 4,
  "memory": 8192,
  "zone": { "id": 1, "name": "default" },
  "pool": { "id": 1, "name": "default" },
  "tags": ["tag1", "tag2"]
}
```

#### Example Subnet Response

```json
{
  "id": 1,
  "name": "test-subnet",
  "cidr": "192.168.1.0/24",
  "vlan": { "id": 1, "name": "default" },
  "fabric": "fabric-0",
  "space": "space-0",
  "gateway_ip": "192.168.1.1",
  "dns_servers": ["8.8.8.8", "8.8.4.4"]
}
```

#### Example Tag Response

```json
{
  "id": 1,
  "name": "test-tag",
  "comment": "Test tag created via MCP Inspector",
  "definition": "//node[@cpu_count > 4]",
  "kernel_opts": "console=tty0",
  "machine_count": 0
}