# Progress Notifications for Long-Running MAAS Operations

This document describes the progress notification system implemented in the MAAS MCP Server for long-running operations.

## Overview

The progress notification system allows clients to receive real-time updates about the status of long-running operations, such as machine deployment, commissioning, or image uploads. This provides a better user experience by keeping clients informed about operation progress rather than having them wait for a final result without any feedback.

## Architecture

The notification system consists of several components working together:

1. **Progress Token Parsing**: Each request can include a `progressToken` parameter that uniquely identifies an operation for sending notifications.

2. **Notification Sending**: The `sendProgressNotification` function handles sending notifications with rate limiting to prevent overwhelming clients.

3. **AbortSignal Support**: Operations can be cancelled using AbortSignals, which will stop notifications and clean up resources.

4. **Server State Management**: The `OperationsRegistry` maintains the state of all operations, including their progress, status, and associated resources.

5. **Operation Handler Integration**: The `withOperationHandler` wrapper integrates the notification system with operation handlers, providing a consistent interface for all long-running operations.

## Using Progress Tokens

### Client-Side

Clients can include a `progressToken` parameter in their requests to receive progress notifications:

```json
{
  "system_id": "abc123",
  "osystem": "ubuntu",
  "distro_series": "jammy",
  "_meta": {
    "progressToken": "deploy-123"
  }
}
```

The `progressToken` can be any string or number that uniquely identifies the operation. It's recommended to use a format that includes the operation type and a unique identifier, such as `deploy-123` or `commission-456`.

### Server-Side

On the server side, the `progressToken` is extracted from the request and used to register the operation in the `OperationsRegistry`. The operation handler then sends progress notifications as the operation progresses.

## Notification Format

Progress notifications are sent using the MCP notification system with the following format:

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "deploy-123",
    "progress": 50,
    "total": 100,
    "message": "Deploying operating system..."
  }
}
```

- `progressToken`: The token identifying the operation
- `progress`: Current progress value (0-100 by default)
- `total`: Total progress value (100 by default)
- `message`: Human-readable message describing the current status

## Rate Limiting

To prevent overwhelming clients with too many notifications, the system implements rate limiting:

- By default, notifications for the same `progressToken` are limited to one per second
- Important notifications (start, completion, errors) bypass rate limiting
- First notification (progress = 0) and last notification (progress = total) always bypass rate limiting
- Rate limiting can be configured with custom intervals

## AbortSignal Support

Operations can be cancelled using AbortSignals:

- Clients can cancel requests using standard HTTP request cancellation mechanisms
- The server propagates the abort signal to all components of the operation
- When an operation is aborted, all resources are cleaned up and a final notification is sent

## Error Handling

The notification system handles errors gracefully:

1. **Notification Sending Errors**: If sending a notification fails, the error is logged but doesn't affect the main operation.

2. **Operation Errors**: If the operation fails, a final notification is sent with an error message.

3. **Abort Errors**: If the operation is aborted, a final notification is sent with an abort message.

## Error Scenarios

### Client Disconnection

If a client disconnects during a long-running operation:

1. The server continues the operation unless explicitly aborted
2. Notifications are still generated but may not be delivered
3. The operation result is stored in the `OperationsRegistry` and can be retrieved later

### Operation Timeout

If an operation takes too long:

1. The operation may time out based on the configured timeout
2. A final notification is sent with a timeout message
3. Resources are cleaned up

### Server Errors

If the server encounters an error during an operation:

1. The operation is marked as failed in the `OperationsRegistry`
2. A final notification is sent with an error message
3. The error is logged for debugging

## Best Practices

1. **Always provide a unique progressToken** for each operation to avoid notification conflicts.

2. **Handle notifications asynchronously** on the client side to avoid blocking the UI.

3. **Implement proper error handling** for cases where notifications may not be delivered.

4. **Use appropriate progress values** that accurately reflect the operation's progress.

5. **Provide meaningful messages** that help users understand what's happening.

## Integration with MCP Tools

The notification system is integrated with MCP tools that perform long-running operations:

- `deployMachineWithProgress`: Deploys a machine with progress notifications
- `commissionMachineWithProgress`: Commissions a machine with progress notifications
- `uploadImageWithProgress`: Uploads an image with progress notifications

These tools use the `withOperationHandler` wrapper to provide a consistent interface for progress notifications.

## Example Usage

See [Progress Notification Client Examples](./examples/progress_notification_client.md) for detailed examples of how to use the notification system from different client types.