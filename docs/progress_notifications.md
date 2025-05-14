# Progress Notifications with Server-Sent Events (SSE)

This document describes the implementation of progress notifications for long-running operations in the MAAS MCP server using Server-Sent Events (SSE).

## Overview

The MAAS MCP server supports long-running operations that may take significant time to complete, such as machine provisioning, OS deployment, or network configuration. To provide real-time feedback to clients about the progress of these operations, the server implements Server-Sent Events (SSE) streaming.

## Architecture

The progress notification system consists of several components:

1. **SSE Transport Layer**: Handles the HTTP connection with proper SSE headers and event formatting
2. **Event Types**: Defines various event types for different notification purposes
3. **Progress Reporting Service**: Allows operations to report their progress
4. **Event Buffering**: Stores recent events for reconnection support
5. **Heartbeat Mechanism**: Keeps connections alive during long operations
6. **Cancellation Support**: Detects client disconnections and cancels operations

### Component Diagram

```
┌─────────────┐     ┌───────────────┐     ┌─────────────────┐
│ MCP Handler │────▶│ Progress      │────▶│ Long-Running    │
│ (SSE)       │◀────│ Tracker       │◀────│ Operation       │
└─────────────┘     └───────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌───────────────┐
                    │ Event Buffer  │
                    │ Heartbeat     │
                    │ Cancellation  │
                    └───────────────┘
```

## Implementation Details

### SSE Transport Layer

The SSE transport layer is implemented in `internal/transport/mcp/handler.go`. It sets the appropriate HTTP headers for SSE streaming:

- `Content-Type: text/event-stream; charset=utf-8`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`
- `Access-Control-Allow-Origin: *`
- `Pragma: no-cache`

Events are formatted according to the SSE specification with `event:`, `data:`, and optional `id:` fields.

### Event Types

Event types are defined in `internal/transport/mcp/events/events.go` and include:

- **ProgressEvent**: Reports progress percentage of operations
- **CompletionEvent**: Signals successful completion of operations
- **ErrorEvent**: Reports errors during operations
- **HeartbeatEvent**: Keeps connections alive
- **LogEvent**: Sends log messages to clients
- **StatusEvent**: Reports status changes

### Progress Reporting Service

The progress reporting service is implemented in `internal/service/progress/` and consists of:

- **ProgressReporter**: Interface for operations to report progress
- **ProgressTracker**: Service that collects progress updates and forwards them to clients

### Event Buffering

Event buffering is implemented in `internal/service/progress/buffer.go`. It stores recent events for each operation in a circular buffer with a configurable capacity. This allows clients to reconnect and receive missed events.

### Heartbeat Mechanism

The heartbeat mechanism is implemented in `internal/service/progress/heartbeat.go`. It sends heartbeat events at regular intervals (default: 30 seconds) to keep connections alive during long operations.

### Cancellation Support

Cancellation support is implemented in `internal/service/progress/cancellation.go`. It detects when clients disconnect from the SSE stream and cancels the associated operation after a configurable timeout.

## Client Usage

Clients can subscribe to progress notifications for a specific operation by making a GET request to the SSE endpoint with the operation ID:

```
GET /mcp/stream?operation_id=<operation_id>
```

The server will respond with a stream of SSE events. Clients can use the `EventSource` API in browsers or equivalent libraries in other environments to consume the events.

### Reconnection

If a client disconnects and reconnects, it can include the `Last-Event-ID` header with the ID of the last event it received. The server will then send all events that occurred after that event.

```
GET /mcp/stream?operation_id=<operation_id>
Last-Event-ID: <last_event_id>
```

### Event Format

Events are formatted as JSON objects with the following structure:

```json
{
  "event": "progress",
  "data": {
    "operation_id": "123",
    "status": "in_progress",
    "progress": 50.0,
    "message": "Deploying OS",
    "details": "Installing packages"
  }
}
```

## Example Client

See [progress_notification_client.md](./examples/progress_notification_client.md) for an example client implementation.