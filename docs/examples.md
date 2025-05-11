# MAAS MCP Server Usage Examples

This document provides practical examples of using the MAAS MCP Server tools for common operations.

## Table of Contents

- [Machine Management](#machine-management)
  - [Creating a Machine](#creating-a-machine)
  - [Updating a Machine](#updating-a-machine)
  - [Deleting a Machine](#deleting-a-machine)
- [Device Management](#device-management)
  - [Creating a Device](#creating-a-device)
  - [Updating a Device](#updating-a-device)
  - [Deleting a Device](#deleting-a-device)
- [Network Management](#network-management)
  - [Creating a Network](#creating-a-network)
  - [Updating a Network](#updating-a-network)
  - [Deleting a Network](#deleting-a-network)
- [File Upload Operations](#file-upload-operations)
  - [Uploading a Script](#uploading-a-script)
  - [Uploading an Image](#uploading-an-image)
- [Error Handling Examples](#error-handling-examples)

## Machine Management

### Creating a Machine

This example demonstrates how to create a new machine with specific requirements.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_create_machine",
    "arguments": {
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
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"id\":\"abc123\",\"message\":\"Machine allocated successfully.\"}}"
      }
    ]
  }
}
```

**Progress Notifications:**
```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress-token-123",
    "progress": 0,
    "total": 100,
    "message": "Initiating machine allocation..."
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress-token-123",
    "progress": 30,
    "total": 100,
    "message": "Contacting MAAS API..."
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress-token-123",
    "progress": 70,
    "total": 100,
    "message": "Machine allocation API call successful."
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "progress-token-123",
    "progress": 100,
    "total": 100,
    "message": "Machine allocated successfully."
  }
}
```

### Updating a Machine

This example demonstrates how to update an existing machine's properties.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_update_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "abc123",
      "payload": {
        "description": "High-performance compute node",
        "tags": ["compute", "high-performance", "production"],
        "pool": "production"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully updated machine abc123.",
    "id": "abc123"
  }
}
```

### Deleting a Machine

This example demonstrates how to delete a machine from MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "abc123"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully deleted machine abc123.",
    "id": "abc123"
  }
}
```

## Device Management

### Creating a Device

This example demonstrates how to create a new device in MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_create_device",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "payload": {
        "hostname": "iot-sensor-1",
        "domain": "maas.local",
        "description": "IoT temperature sensor",
        "interfaces": [
          {
            "name": "eth0",
            "mac_address": "00:11:22:33:44:55",
            "subnet": "192.168.1.0/24",
            "ip_address": "192.168.1.100"
          }
        ]
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"id\":\"device-123\",\"message\":\"Device created successfully.\"}}"
      }
    ]
  }
}
```

### Updating a Device

This example demonstrates how to update an existing device's properties.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_update_device",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "device-123",
      "payload": {
        "description": "Updated IoT temperature sensor",
        "interfaces": [
          {
            "id": "interface-123",
            "ip_address": "192.168.1.101"
          }
        ]
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully updated device device-123.",
    "id": "device-123"
  }
}
```

### Deleting a Device

This example demonstrates how to delete a device from MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_device",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "device-123"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully deleted device device-123.",
    "id": "device-123"
  }
}
```

## Network Management

### Creating a Network

This example demonstrates how to create a new network in MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_create_network",
    "arguments": {
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
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"data\":{\"id\":\"network-123\",\"message\":\"Network created successfully.\"}}"
      }
    ]
  }
}
```

### Updating a Network

This example demonstrates how to update an existing network's properties.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_update_network",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "network-123",
      "payload": {
        "description": "Updated management network",
        "gateway_ip": "192.168.1.254",
        "dns_servers": ["1.1.1.1", "1.0.0.1"]
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully updated network network-123.",
    "id": "network-123"
  }
}
```

### Deleting a Network

This example demonstrates how to delete a network from MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_network",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "network-123"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "_meta": {
      "requestId": "req-123"
    },
    "message": "Successfully deleted network network-123.",
    "id": "network-123"
  }
}
```

## File Upload Operations

### Uploading a Script

This example demonstrates how to upload a script to MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_upload_script",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "name": "memory-test",
      "description": "Tests memory performance",
      "tags": "memory,performance",
      "script_type": "testing",
      "script_content": "#!/bin/bash\necho 'Testing memory...'\n# Memory test script content\necho 'Memory test completed.'\nexit 0",
      "timeout": 300,
      "parallel": true,
      "hardware_type": "memory"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"message\":\"Script 'memory-test' uploaded successfully\",\"id\":\"memory-test\"}"
      }
    ]
  }
}
```

### Uploading an Image

This example demonstrates how to upload a custom image to MAAS.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_upload_image",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "name": "custom-ubuntu",
      "description": "Custom Ubuntu image",
      "architecture": "amd64",
      "image_type": "root-tgz",
      "image_content": "base64-encoded-content-here"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"message\":\"Image 'custom-ubuntu' uploaded successfully\",\"id\":\"custom-ubuntu\"}"
      }
    ]
  }
}
```

## Error Handling Examples

### Resource Not Found Error

This example shows the error response when trying to update a non-existent machine.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_update_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "nonexistent-machine",
      "payload": {
        "description": "This machine doesn't exist"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Resource not found: Machine with ID 'nonexistent-machine' was not found."
      }
    ],
    "isError": true
  }
}
```

### Validation Error

This example shows the error response when providing invalid parameters.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_create_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "payload": {
        "min_cpu_count": -1,
        "min_memory": -8192
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Validation error: min_cpu_count must be a positive integer. min_memory must be a positive integer."
      }
    ],
    "isError": true
  }
}
```

### Resource Conflict Error

This example shows the error response when trying to create a resource that already exists.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_upload_script",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "name": "existing-script",
      "script_type": "testing",
      "script_content": "#!/bin/bash\necho 'Test script'\n"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Resource conflict: Script with name 'existing-script' already exists."
      }
    ],
    "isError": true
  }
}
```

### Permission Denied Error

This example shows the error response when the user doesn't have permission to perform an operation.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "protected-machine"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Permission denied: You do not have permission to delete machine 'protected-machine'."
      }
    ],
    "isError": true
  }
}
```

### Invalid State Error

This example shows the error response when trying to perform an operation on a resource in an invalid state.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_machine",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "deployed-machine"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Invalid state: Machine 'deployed-machine' is in state 'deployed' and cannot be deleted. Machine must be in a deletable state."
      }
    ],
    "isError": true
  }
}
```

### Resource Busy Error

This example shows the error response when trying to perform an operation on a busy resource.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "maas_delete_network",
    "arguments": {
      "_meta": {
        "requestId": "req-123"
      },
      "id": "busy-network"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Resource busy: Network 'busy-network' is currently in use and cannot be deleted."
      }
    ],
    "isError": true
  }
}