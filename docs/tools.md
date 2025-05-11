# MAAS MCP Server Tools Documentation

This document provides comprehensive documentation for all tools available in the MAAS MCP Server.

## Table of Contents

- [Read Operations](#read-operations)
  - [maas_list_machines](#maas_list_machines)
  - [maas_list_subnets](#maas_list_subnets)
  - [maas_create_tag](#maas_create_tag)
- [Create Operations](#create-operations)
  - [maas_create_machine](#maas_create_machine)
  - [maas_create_device](#maas_create_device)
  - [maas_create_network](#maas_create_network)
  - [maas_create_tag](#maas_create_tag)
- [Update Operations](#update-operations)
  - [maas_update_machine](#maas_update_machine)
  - [maas_update_device](#maas_update_device)
  - [maas_update_network](#maas_update_network)
- [Delete Operations](#delete-operations)
  - [maas_delete_machine](#maas_delete_machine)
  - [maas_delete_device](#maas_delete_device)
  - [maas_delete_network](#maas_delete_network)
- [File Upload Operations](#file-upload-operations)
  - [maas_upload_script](#maas_upload_script)
  - [maas_upload_image](#maas_upload_image)
- [Error Handling](#error-handling)
  - [Common Error Types](#common-error-types)
  - [Error Response Format](#error-response-format)

## Read Operations

### maas_list_machines

Lists all machines from the MAAS API with optional filtering.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `hostname` (string, optional): Filter machines by hostname (supports globbing).
- `mac_address` (string, optional): Filter machines by a MAC address.
- `tag_names` (array of string, optional): Filter machines by a list of tag names.
- `status` (string, optional): Filter machines by their status (e.g., 'ready', 'deployed', 'commissioning').
- `zone` (string, optional): Filter machines by zone name.
- `pool` (string, optional): Filter machines by resource pool name.
- `owner` (string, optional): Filter machines by owner username.
- `architecture` (string, optional): Filter machines by architecture.
- `limit` (number, optional): Limit the number of machines returned.
- `offset` (number, optional): Skip the first N machines in the result set.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "status": "ready",
  "tag_names": ["compute", "storage"]
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "json",
      "json": {
        "_meta": {
          "requestId": "req-123"
        },
        "machines": [
          {
            "system_id": "abc123",
            "hostname": "machine-1",
            "status": "ready",
            "tags": ["compute", "storage"]
          },
          {
            "system_id": "def456",
            "hostname": "machine-2",
            "status": "ready",
            "tags": ["compute"]
          }
        ]
      }
    }
  ]
}
```

**Possible Errors:**
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.
- `VALIDATION_ERROR`: Invalid parameters provided.

### maas_list_subnets

Lists subnets from the MAAS API with optional filtering.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `cidr` (string, optional): Filter subnets by CIDR notation.
- `name` (string, optional): Filter subnets by name.
- `vlan` (string, optional): Filter subnets by VLAN ID.
- `fabric` (string, optional): Filter subnets by fabric name.
- `space` (string, optional): Filter subnets by space name.
- `id` (string, optional): Filter subnets by ID.
- `limit` (number, optional): Limit the number of subnets returned.
- `offset` (number, optional): Skip the first N subnets in the result set.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "cidr": "192.168.1.0/24"
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "json",
      "json": {
        "_meta": {
          "requestId": "req-123"
        },
        "subnets": [
          {
            "id": 1,
            "name": "management-subnet",
            "cidr": "192.168.1.0/24",
            "vlan": 1,
            "fabric": "fabric-0"
          }
        ]
      }
    }
  ]
}
```

**Possible Errors:**
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.
- `VALIDATION_ERROR`: Invalid parameters provided.

### maas_create_tag

Creates a new tag in MAAS.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `name` (string, required): The name of the tag to create.
- `comment` (string, optional): Optional comment to describe the purpose of the tag.
- `definition` (string, optional): Optional tag definition expression to automatically tag matching nodes.
- `kernel_opts` (string, optional): Optional kernel options to be used when booting a machine with this tag.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "name": "compute",
  "comment": "Compute nodes",
  "definition": "//node[@cpu_count > 4]"
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "json",
      "json": {
        "_meta": {
          "requestId": "req-123"
        },
        "message": "Tag created successfully",
        "id": "compute"
      }
    }
  ]
}
```

**Possible Errors:**
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.
- `VALIDATION_ERROR`: Invalid parameters provided.
- `RESOURCE_CONFLICT_ERROR`: A tag with the same name already exists.

## Create Operations

### maas_create_machine

Creates a new machine in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `payload` (object, required): Machine creation parameters.
  - `architecture` (string, optional): CPU architecture, e.g., amd64, arm64.
  - `min_hba` (number, optional): Minimum number of Host Bus Adapters.
  - `min_cpu_count` (number, optional): Minimum number of CPU cores.
  - `min_memory` (number, optional): Minimum memory in MB.
  - `tags` (array of string, optional): List of tags to apply to the machine.
  - `pool` (string, optional): Name or ID of the resource pool to allocate from.
  - `zone` (string, optional): Name or ID of the zone to allocate from.
  - `interfaces` (array of string, optional): Interface constraints, e.g., "name=eth0,subnet_id=123".
  - `hostname` (string, optional): Desired hostname for the machine.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123",
    "progressToken": "progress-token-123"
  },
  "payload": {
    "architecture": "amd64/generic",
    "min_cpu_count": 4,
    "min_memory": 8192,
    "tags": ["compute", "storage"],
    "pool": "default",
    "zone": "default"
  }
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"data\":{\"id\":\"abc123\",\"message\":\"Machine allocated successfully.\"}}"
    }
  ]
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `RESOURCE_CONFLICT_ERROR`: Resource conflict in MAAS API.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.
- `NOT_FOUND_ERROR`: Resource pool or zone not found.

### maas_create_device

Creates a new device in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `payload` (object, required): Device creation parameters.
  - `hostname` (string, required): Hostname for the new device.
  - `domain` (string, optional): Domain for the device.
  - `description` (string, optional): Description of the device.
  - `parent` (string, optional): System ID of the parent machine.
  - `interfaces` (array of object, optional): Network interfaces for the device.
    - `name` (string, required): Interface name.
    - `mac_address` (string, required): MAC address for the interface.
    - `subnet` (string, optional): Subnet ID or CIDR.
    - `ip_address` (string, optional): Static IP address for the interface.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "payload": {
    "hostname": "device-1",
    "domain": "maas.local",
    "description": "Test device",
    "interfaces": [
      {
        "name": "eth0",
        "mac_address": "00:11:22:33:44:55",
        "subnet": "192.168.1.0/24"
      }
    ]
  }
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"data\":{\"id\":\"device-123\",\"message\":\"Device created successfully.\"}}"
    }
  ]
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `RESOURCE_CONFLICT_ERROR`: A device with the same hostname or MAC address already exists.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_create_network

Creates a new network in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `payload` (object, required): Network creation parameters.
  - `name` (string, required): Name for the new network.
  - `cidr` (string, required): CIDR notation for the network.
  - `vlan` (number, optional): VLAN ID for the network.
  - `fabric` (string, optional): Fabric name or ID.
  - `description` (string, optional): Description of the network.
  - `gateway_ip` (string, optional): Gateway IP address for the network.
  - `dns_servers` (array of string, optional): DNS servers for the network.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "payload": {
    "name": "management-network",
    "cidr": "192.168.1.0/24",
    "vlan": 1,
    "fabric": "fabric-0",
    "description": "Management network",
    "gateway_ip": "192.168.1.1",
    "dns_servers": ["8.8.8.8", "8.8.4.4"]
  }
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"data\":{\"id\":\"network-123\",\"message\":\"Network created successfully.\"}}"
    }
  ]
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `RESOURCE_CONFLICT_ERROR`: A network with the same name or CIDR already exists.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

## Update Operations

### maas_update_machine

Updates an existing machine in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the machine to update.
- `payload` (object, required): Machine update parameters.
  - `description` (string, optional): New description for the machine.
  - `power_type` (string, optional): New power type for the machine (e.g., 'ipmi').
  - `power_parameters` (object, optional): New power parameters for the machine.
  - `tags` (array of string, optional): List of tags to assign to the machine. Replaces existing tags.
  - `pool` (string, optional): The resource pool to assign the machine to.
  - `zone` (string, optional): The zone to assign the machine to.
  - `interfaces` (string, optional): Network interface configurations.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "abc123",
  "payload": {
    "description": "Updated machine description",
    "tags": ["compute", "storage", "database"],
    "pool": "production"
  }
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully updated machine abc123.",
  "id": "abc123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Machine not found.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `INVALID_STATE_ERROR`: Machine is in an invalid state for this operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_update_device

Updates an existing device in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the device to update.
- `payload` (object, required): Device update parameters.
  - `hostname` (string, optional): New hostname for the device.
  - `domain` (string, optional): New domain for the device.
  - `description` (string, optional): New description of the device.
  - `parent` (string, optional): System ID of the new parent machine.
  - `interfaces` (array of object, optional): Updated network interfaces for the device.
    - `id` (string, required): Interface ID.
    - `name` (string, optional): New interface name.
    - `mac_address` (string, optional): New MAC address for the interface.
    - `subnet` (string, optional): New subnet ID or CIDR.
    - `ip_address` (string, optional): New static IP address for the interface.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "device-123",
  "payload": {
    "hostname": "device-1-updated",
    "description": "Updated test device",
    "interfaces": [
      {
        "id": "interface-123",
        "subnet": "192.168.2.0/24",
        "ip_address": "192.168.2.100"
      }
    ]
  }
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully updated device device-123.",
  "id": "device-123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Device not found.
- `RESOURCE_CONFLICT_ERROR`: A device with the same hostname or MAC address already exists.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_update_network

Updates an existing network in the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the network to update.
- `payload` (object, required): Network update parameters.
  - `name` (string, optional): New name for the network.
  - `description` (string, optional): New description of the network.
  - `gateway_ip` (string, optional): New gateway IP address for the network.
  - `dns_servers` (array of string, optional): New DNS servers for the network.
  - `vlan` (number, optional): New VLAN ID for the network.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "network-123",
  "payload": {
    "name": "management-network-updated",
    "description": "Updated management network",
    "gateway_ip": "192.168.1.254",
    "dns_servers": ["1.1.1.1", "1.0.0.1"]
  }
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully updated network network-123.",
  "id": "network-123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Network not found.
- `RESOURCE_CONFLICT_ERROR`: A network with the same name already exists.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

## Delete Operations

### maas_delete_machine

Deletes a machine from the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the machine to delete.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "abc123"
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully deleted machine abc123.",
  "id": "abc123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Machine not found.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `INVALID_STATE_ERROR`: Machine is in an invalid state for deletion.
- `RESOURCE_BUSY_ERROR`: Machine is busy and cannot be deleted.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_delete_device

Deletes a device from the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the device to delete.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "device-123"
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully deleted device device-123.",
  "id": "device-123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Device not found.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_delete_network

Deletes a network from the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `id` (string, required): ID of the network to delete.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "id": "network-123"
}
```

**Example Response:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "message": "Successfully deleted network network-123.",
  "id": "network-123"
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Network not found.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `RESOURCE_BUSY_ERROR`: Network is in use and cannot be deleted.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

## File Upload Operations

### maas_upload_script

Uploads a script to the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `name` (string, required): Name of the script.
- `description` (string, optional): Description of the script.
- `tags` (string, optional): Comma-separated list of tags.
- `script_type` (string, required): Type of script. Must be one of: "commissioning", "testing".
- `script_content` (string, required): Content of the script file.
- `timeout` (number, optional): Script timeout in seconds.
- `parallel` (boolean, optional): Whether the script can run in parallel.
- `hardware_type` (string, optional): Hardware type the script is for. Must be one of: "node", "cpu", "memory", "storage".
- `for_hardware` (string, optional): Hardware the script is specifically for.

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "name": "memory-test",
  "description": "Tests memory performance",
  "tags": "memory,performance",
  "script_type": "testing",
  "script_content": "#!/bin/bash\necho 'Testing memory...'\n# Script content here",
  "timeout": 300,
  "parallel": true,
  "hardware_type": "memory"
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"message\":\"Script 'memory-test' uploaded successfully\",\"id\":\"memory-test\"}"
    }
  ]
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `RESOURCE_CONFLICT_ERROR`: A script with the same name already exists.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### maas_upload_image

Uploads an image to the MAAS server.

**Parameters:**
- `_meta` (object, optional): Metadata for the request.
- `name` (string, required): Name of the image.
- `description` (string, optional): Description of the image.
- `architecture` (string, required): Architecture for the image (e.g., "amd64", "arm64").
- `image_content` (string, required): Base64-encoded content of the image file.
- `image_type` (string, required): Type of image. Must be one of: "boot", "squashfs", "root-tgz", "root-dd".

**Example Request:**
```json
{
  "_meta": {
    "requestId": "req-123"
  },
  "name": "custom-ubuntu",
  "description": "Custom Ubuntu image",
  "architecture": "amd64",
  "image_type": "root-tgz",
  "image_content": "base64-encoded-content-here"
}
```

**Example Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"message\":\"Image 'custom-ubuntu' uploaded successfully\",\"id\":\"custom-ubuntu\"}"
    }
  ]
}
```

**Possible Errors:**
- `VALIDATION_ERROR`: Invalid parameters provided.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `RESOURCE_CONFLICT_ERROR`: An image with the same name already exists.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

## Error Handling

### Common Error Types

The MAAS MCP Server uses standardized error types to provide consistent error handling across all tools.

- `VALIDATION_ERROR`: Invalid parameters or input data.
- `MAAS_API_ERROR`: Generic error from the MAAS API.
- `AUTHENTICATION_ERROR`: Authentication failed with MAAS API.
- `NOT_FOUND_ERROR`: Resource not found in MAAS API.
- `INTERNAL_ERROR`: Internal server error.
- `RESOURCE_CONFLICT_ERROR`: Resource conflict in MAAS API.
- `PERMISSION_DENIED_ERROR`: Permission denied for this MAAS API operation.
- `RESOURCE_BUSY_ERROR`: Resource is busy and cannot be modified.
- `INVALID_STATE_ERROR`: Resource is in an invalid state for this operation.
- `NETWORK_ERROR`: Network error while communicating with MAAS API.

### Error Response Format

All error responses follow a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message describing the issue"
    }
  ],
  "isError": true
}
```

The error message will include details about the specific error type and any relevant context to help diagnose and resolve the issue.