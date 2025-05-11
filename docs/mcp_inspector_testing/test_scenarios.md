# MCP Inspector Test Scenarios

This document outlines specific test scenarios for testing the MAAS MCP Server using the MCP Inspector tool. These scenarios cover different functionality areas and include both happy path and error path testing.

## Table of Contents

- [Tool Testing Scenarios](#tool-testing-scenarios)
  - [Machine Management Tools](#machine-management-tools)
  - [Network Management Tools](#network-management-tools)
  - [Tag Management Tools](#tag-management-tools)
  - [File Upload Tools](#file-upload-tools)
- [Resource Testing Scenarios](#resource-testing-scenarios)
  - [Machine Resources](#machine-resources)
  - [Network Resources](#network-resources)
  - [Tag Resources](#tag-resources)
- [Error Handling Scenarios](#error-handling-scenarios)
- [AbortSignal Cancellation Scenarios](#abortsignal-cancellation-scenarios)
- [Edge Case Scenarios](#edge-case-scenarios)

## Tool Testing Scenarios

### Machine Management Tools

#### Test Case T-MM-01: List All Machines

| Attribute | Description |
|-----------|-------------|
| Test ID | T-MM-01 |
| Description | Verify that the `maas_list_machines` tool returns all machines when called without parameters |
| Prerequisites | MAAS instance with at least 3 machines registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns a JSON array containing all machines in the MAAS instance |

#### Test Case T-MM-02: Filter Machines by Hostname

| Attribute | Description |
|-----------|-------------|
| Test ID | T-MM-02 |
| Description | Verify that the `maas_list_machines` tool correctly filters machines by hostname |
| Prerequisites | MAAS instance with machines having different hostnames |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set the "hostname" parameter to a known partial hostname<br>5. Execute the tool |
| Expected Result | Tool returns only machines whose hostnames contain the specified string |

#### Test Case T-MM-03: Filter Machines by Status

| Attribute | Description |
|-----------|-------------|
| Test ID | T-MM-03 |
| Description | Verify that the `maas_list_machines` tool correctly filters machines by status |
| Prerequisites | MAAS instance with machines in different states |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Set the "status" parameter to "ready"<br>5. Execute the tool |
| Expected Result | Tool returns only machines with "Ready" status |

#### Test Case T-MM-04: Deploy Machine with Progress

| Attribute | Description |
|-----------|-------------|
| Test ID | T-MM-04 |
| Description | Verify that the `maas_deploy_machine_with_progress` tool correctly deploys a machine and reports progress |
| Prerequisites | MAAS instance with at least one machine in "Ready" state |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_deploy_machine_with_progress" tool<br>4. Set the "system_id" parameter to a valid machine ID<br>5. Execute the tool |
| Expected Result | Tool initiates deployment and returns progress notifications until completion |

#### Test Case T-MM-05: Commission Machine with Progress

| Attribute | Description |
|-----------|-------------|
| Test ID | T-MM-05 |
| Description | Verify that the `maas_commission_machine_with_progress` tool correctly commissions a machine and reports progress |
| Prerequisites | MAAS instance with at least one machine in appropriate state for commissioning |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_commission_machine_with_progress" tool<br>4. Set the "system_id" parameter to a valid machine ID<br>5. Execute the tool |
| Expected Result | Tool initiates commissioning and returns progress notifications until completion |

### Network Management Tools

#### Test Case T-NM-01: List All Subnets

| Attribute | Description |
|-----------|-------------|
| Test ID | T-NM-01 |
| Description | Verify that the `maas_list_subnets` tool returns all subnets when called without parameters |
| Prerequisites | MAAS instance with at least 2 subnets configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns a JSON array containing all subnets in the MAAS instance |

#### Test Case T-NM-02: Filter Subnets by CIDR

| Attribute | Description |
|-----------|-------------|
| Test ID | T-NM-02 |
| Description | Verify that the `maas_list_subnets` tool correctly filters subnets by CIDR |
| Prerequisites | MAAS instance with subnets having different CIDRs |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_subnets" tool<br>4. Set the "cidr" parameter to a known CIDR (e.g., "192.168.1.0/24")<br>5. Execute the tool |
| Expected Result | Tool returns only subnets matching the specified CIDR |

### Tag Management Tools

#### Test Case T-TM-01: Create Simple Tag

| Attribute | Description |
|-----------|-------------|
| Test ID | T-TM-01 |
| Description | Verify that the `maas_create_tag` tool can create a basic tag |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-1"<br>5. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name |

#### Test Case T-TM-02: Create Tag with Comment

| Attribute | Description |
|-----------|-------------|
| Test ID | T-TM-02 |
| Description | Verify that the `maas_create_tag` tool can create a tag with a comment |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-2"<br>5. Set "comment" parameter to "Test tag created via MCP Inspector"<br>6. Execute the tool |
| Expected Result | Tool returns a JSON object representing the newly created tag with the specified name and comment |

### File Upload Tools

#### Test Case T-FU-01: Upload Script

| Attribute | Description |
|-----------|-------------|
| Test ID | T-FU-01 |
| Description | Verify that the `maas_upload_script` tool can upload a script to MAAS |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_upload_script" tool<br>4. Set "name" parameter to "test-script"<br>5. Set "script_content" parameter to a valid script content<br>6. Execute the tool |
| Expected Result | Tool returns a success message indicating the script was uploaded |

#### Test Case T-FU-02: Upload Image

| Attribute | Description |
|-----------|-------------|
| Test ID | T-FU-02 |
| Description | Verify that the `maas_upload_image` tool can upload an image to MAAS |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_upload_image" tool<br>4. Set required parameters including image data<br>5. Execute the tool |
| Expected Result | Tool returns a success message indicating the image was uploaded |

## Resource Testing Scenarios

### Machine Resources

#### Test Case R-MR-01: Fetch Valid Machine Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MR-01 |
| Description | Verify that the machineDetails resource returns correct information for a valid machine ID |
| Prerequisites | MAAS instance with at least one machine registered |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine/{system_id}/details" with a valid system_id<br>4. Execute the resource request |
| Expected Result | Resource returns a JSON object containing detailed information about the specified machine |

#### Test Case R-MR-02: Fetch Non-existent Machine Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-MR-02 |
| Description | Verify that the machineDetails resource handles requests for non-existent machines |
| Prerequisites | None |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://machine/nonexistent-id/details"<br>4. Execute the resource request |
| Expected Result | Resource returns an appropriate error message indicating the machine was not found |

### Network Resources

#### Test Case R-NR-01: Fetch Valid Subnet Details

| Attribute | Description |
|-----------|-------------|
| Test ID | R-NR-01 |
| Description | Verify that the subnetDetails resource returns correct information for a valid subnet ID |
| Prerequisites | MAAS instance with at least one subnet configured |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://subnet/{subnet_id}/details" with a valid subnet_id<br>4. Execute the resource request |
| Expected Result | Resource returns a JSON object containing detailed information about the specified subnet |

### Tag Resources

#### Test Case R-TR-01: Fetch Tags Collection

| Attribute | Description |
|-----------|-------------|
| Test ID | R-TR-01 |
| Description | Verify that the tags resource returns a collection of all tags |
| Prerequisites | MAAS instance with at least one tag created |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Resources section<br>3. Enter the URI "maas://tags"<br>4. Execute the resource request |
| Expected Result | Resource returns a JSON array containing all tags in the MAAS instance |

## Error Handling Scenarios

#### Test Case E-EH-01: MAAS API Unavailable

| Attribute | Description |
|-----------|-------------|
| Test ID | E-EH-01 |
| Description | Verify that MCP tools and resources handle MAAS API unavailability gracefully |
| Prerequisites | MCP server configured with incorrect MAAS API URL or credentials |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns an appropriate error message indicating connection failure |

#### Test Case E-EH-02: Invalid API Key

| Attribute | Description |
|-----------|-------------|
| Test ID | E-EH-02 |
| Description | Verify that MCP tools and resources handle authentication failures gracefully |
| Prerequisites | MCP server configured with invalid MAAS API key |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool returns an appropriate error message indicating authentication failure |

## AbortSignal Cancellation Scenarios

#### Test Case A-AS-01: Cancel Long-Running Tool

| Attribute | Description |
|-----------|-------------|
| Test ID | A-AS-01 |
| Description | Verify that all tools properly handle AbortSignal cancellation |
| Prerequisites | MAAS instance with many machines (or simulated network delay) |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select each tool in turn<br>4. Start executing the tool<br>5. Immediately cancel the request using the MCP Inspector's cancel button |
| Expected Result | Each tool's request is cancelled, and an appropriate error message is returned |

## Edge Case Scenarios

#### Test Case EC-EC-01: List Many Machines

| Attribute | Description |
|-----------|-------------|
| Test ID | EC-EC-01 |
| Description | Verify that the listMachines tool can handle large responses |
| Prerequisites | MAAS instance with many machines (50+) |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_list_machines" tool<br>4. Execute the tool without any parameters |
| Expected Result | Tool successfully returns all machines without timing out or crashing |

#### Test Case EC-EC-02: Create Tag with Special Characters

| Attribute | Description |
|-----------|-------------|
| Test ID | EC-EC-02 |
| Description | Verify that the createTag tool handles special characters in tag names and comments |
| Prerequisites | MAAS instance with appropriate permissions |
| Steps | 1. Open MCP Inspector<br>2. Navigate to Tools section<br>3. Select "maas_create_tag" tool<br>4. Set "name" parameter to "test-tag-special-!@#"<br>5. Set "comment" parameter to "Comment with special chars: !@#$%^&*()"<br>6. Execute the tool |
| Expected Result | Tool handles special characters appropriately (either by creating the tag or returning a clear error message) |