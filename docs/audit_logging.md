# Audit Logging

This document describes the audit logging functionality in the MAAS MCP Server, which provides comprehensive logging for resource access and modifications to support auditing requirements.

## Overview

The audit logging system captures detailed information about resource access and modifications, including:

- Who accessed or modified a resource (user ID, IP address)
- What resource was accessed or modified (resource type, resource ID)
- When the access or modification occurred (timestamp)
- How the resource was accessed or modified (action)
- What was changed (before and after states, if enabled)
- Whether the operation succeeded or failed (status)
- Additional context (request ID, details)

This information is valuable for security auditing, compliance, troubleshooting, and understanding system usage patterns.

## Configuration

Audit logging can be configured using the following environment variables:

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `AUDIT_LOG_ENABLED` | Enable or disable audit logging | `true` |
| `AUDIT_LOG_INCLUDE_RESOURCE_STATE` | Include the full resource state in logs | `false` |
| `AUDIT_LOG_MASK_SENSITIVE_FIELDS` | Mask sensitive fields in the resource state | `true` |
| `AUDIT_LOG_SENSITIVE_FIELDS` | Comma-separated list of sensitive field names to mask | `password,token,secret,key,credential` |
| `AUDIT_LOG_TO_FILE` | Log to a separate file | `false` |
| `AUDIT_LOG_FILE_PATH` | Path to the audit log file | (none) |

These settings can be configured in the `.env` file or as environment variables.

## Log Format

Audit logs include the following information:

- `eventType`: The type of event (e.g., `resource_access`, `resource_modification`, `cache_operation`)
- `resourceType`: The type of resource (e.g., `Machine`, `Tag`, `Subnet`)
- `resourceId`: The ID of the resource (if applicable)
- `action`: The action being performed (e.g., `read`, `update`, `delete`)
- `status`: The status of the operation (`success` or `failure`)
- `userId`: The ID of the user performing the operation (if available)
- `ipAddress`: The IP address of the client (if available)
- `requestId`: A unique ID for the request
- `timestamp`: The time the event occurred
- `details`: Additional details about the operation
- `beforeState`: The state of the resource before modification (if enabled)
- `afterState`: The state of the resource after modification (if enabled)
- `errorDetails`: Details about any errors that occurred (for failure events)

## Logged Events

The following types of events are logged:

### Resource Access

Resource access events are logged when a resource is accessed, such as when a client requests a resource through the MCP server.

Example:
```json
{
  "eventType": "resource_access",
  "resourceType": "Machine",
  "resourceId": "abc123",
  "action": "read",
  "status": "success",
  "userId": "admin",
  "ipAddress": "192.168.1.100",
  "requestId": "req_123456",
  "timestamp": "2025-05-11T09:30:00.000Z",
  "details": {
    "uri": "maas://machines/abc123"
  }
}
```

### Resource Modification

Resource modification events are logged when a resource is modified, such as when a client uses a tool to modify a resource.

Example:
```json
{
  "eventType": "resource_modification",
  "resourceType": "Machine",
  "resourceId": "abc123",
  "action": "update",
  "status": "success",
  "userId": "admin",
  "ipAddress": "192.168.1.100",
  "requestId": "req_123456",
  "timestamp": "2025-05-11T09:35:00.000Z",
  "details": {
    "toolName": "updateMachine",
    "arguments": "{\"system_id\":\"abc123\",\"hostname\":\"new-hostname\"}"
  },
  "beforeState": {
    "system_id": "abc123",
    "hostname": "old-hostname",
    "status": "Ready"
  },
  "afterState": {
    "system_id": "abc123",
    "hostname": "new-hostname",
    "status": "Ready"
  }
}
```

### Cache Operations

Cache operations are logged when the cache is accessed or modified, such as when a resource is cached or retrieved from the cache.

Example:
```json
{
  "eventType": "cache_operation",
  "resourceType": "Machine",
  "resourceId": "abc123",
  "action": "hit",
  "status": "success",
  "requestId": "req_123456",
  "timestamp": "2025-05-11T09:40:00.000Z",
  "details": {
    "cacheKey": "Machine:abc123"
  }
}
```

## Sensitive Data Handling

By default, sensitive fields are masked in the resource state to prevent leaking sensitive information in the logs. The fields to mask can be configured using the `AUDIT_LOG_SENSITIVE_FIELDS` environment variable.

Example of masked data:
```json
{
  "system_id": "abc123",
  "hostname": "machine-1",
  "credentials": "********"
}
```

## Performance Considerations

Audit logging can impact performance, especially when logging the full resource state. Consider the following:

- Set `AUDIT_LOG_INCLUDE_RESOURCE_STATE` to `false` in production environments with high traffic
- Use a separate log file for audit logs to avoid impacting application logs
- Consider using a log aggregation system to collect and analyze audit logs

## Integration with Error Handling

Audit logging is integrated with the existing error handling patterns in the MAAS MCP Server. When an error occurs during a resource access or modification, the error details are included in the audit log.

Example of an error log:
```json
{
  "eventType": "resource_access",
  "resourceType": "Machine",
  "resourceId": "abc123",
  "action": "read",
  "status": "failure",
  "userId": "admin",
  "ipAddress": "192.168.1.100",
  "requestId": "req_123456",
  "timestamp": "2025-05-11T09:45:00.000Z",
  "details": {
    "uri": "maas://machines/abc123"
  },
  "errorDetails": {
    "message": "Resource not found",
    "stack": "Error: Resource not found\n    at ..."
  }
}
```

## Programmatic Access

The audit logging functionality is available programmatically through the `auditLogger` module:

```typescript
import auditLogger from '../utils/auditLogger.js';

// Log a resource access event
auditLogger.logResourceAccess(
  'Machine',
  'abc123',
  'read',
  requestId,
  userId,
  ipAddress,
  { uri: 'maas://machines/abc123' }
);

// Log a resource modification event
auditLogger.logResourceModification(
  'Machine',
  'abc123',
  'update',
  requestId,
  beforeState,
  afterState,
  userId,
  ipAddress,
  { toolName: 'updateMachine' }
);

// Log a cache operation
auditLogger.logCacheOperation(
  'Machine',
  'hit',
  requestId,
  'abc123',
  { cacheKey: 'Machine:abc123' }
);
```

## Conclusion

The audit logging functionality in the MAAS MCP Server provides comprehensive logging for resource access and modifications to support auditing requirements. It is configurable, integrated with the existing error handling patterns, and provides valuable information for security auditing, compliance, troubleshooting, and understanding system usage patterns.