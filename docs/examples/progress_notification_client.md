# Progress Notification Client Example

This document provides examples of how to implement clients that consume progress notifications from the MAAS MCP server using Server-Sent Events (SSE).

## Browser JavaScript Example

Here's an example of how to consume progress notifications in a browser using the `EventSource` API:

```javascript
class ProgressNotificationClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.eventSource = null;
    this.lastEventId = null;
    this.operationId = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.onLog = null;
    this.onStatus = null;
  }

  /**
   * Subscribe to progress notifications for an operation
   * @param {string} operationId - The ID of the operation to subscribe to
   * @param {object} callbacks - Callback functions for different event types
   * @param {function} callbacks.onProgress - Called when a progress event is received
   * @param {function} callbacks.onComplete - Called when a completion event is received
   * @param {function} callbacks.onError - Called when an error event is received
   * @param {function} callbacks.onLog - Called when a log event is received
   * @param {function} callbacks.onStatus - Called when a status event is received
   */
  subscribe(operationId, callbacks = {}) {
    this.operationId = operationId;
    this.onProgress = callbacks.onProgress;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
    this.onLog = callbacks.onLog;
    this.onStatus = callbacks.onStatus;

    // Close existing connection if any
    this.close();

    // Create a new EventSource
    const url = `${this.baseUrl}/mcp/stream?operation_id=${operationId}`;
    this.eventSource = new EventSource(url);

    // Set up event listeners
    this.eventSource.addEventListener('progress', this._handleProgressEvent.bind(this));
    this.eventSource.addEventListener('complete', this._handleCompleteEvent.bind(this));
    this.eventSource.addEventListener('error', this._handleErrorEvent.bind(this));
    this.eventSource.addEventListener('log', this._handleLogEvent.bind(this));
    this.eventSource.addEventListener('status', this._handleStatusEvent.bind(this));
    this.eventSource.addEventListener('heartbeat', this._handleHeartbeatEvent.bind(this));

    // Handle connection errors
    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      if (this.eventSource.readyState === EventSource.CLOSED) {
        // Connection closed, attempt to reconnect with last event ID
        setTimeout(() => {
          this.reconnect();
        }, 5000); // Reconnect after 5 seconds
      }
    };
  }

  /**
   * Reconnect to the server with the last event ID
   */
  reconnect() {
    if (!this.operationId) {
      return;
    }

    // Close existing connection if any
    this.close();

    // Create a new EventSource with the last event ID
    let url = `${this.baseUrl}/mcp/stream?operation_id=${this.operationId}`;
    if (this.lastEventId) {
      url += `&last_event_id=${this.lastEventId}`;
    }
    
    this.eventSource = new EventSource(url);
    
    // Set up event listeners again
    this.eventSource.addEventListener('progress', this._handleProgressEvent.bind(this));
    this.eventSource.addEventListener('complete', this._handleCompleteEvent.bind(this));
    this.eventSource.addEventListener('error', this._handleErrorEvent.bind(this));
    this.eventSource.addEventListener('log', this._handleLogEvent.bind(this));
    this.eventSource.addEventListener('status', this._handleStatusEvent.bind(this));
    this.eventSource.addEventListener('heartbeat', this._handleHeartbeatEvent.bind(this));
    
    // Handle connection errors
    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      if (this.eventSource.readyState === EventSource.CLOSED) {
        // Connection closed, attempt to reconnect with last event ID
        setTimeout(() => {
          this.reconnect();
        }, 5000); // Reconnect after 5 seconds
      }
    };
  }

  /**
   * Close the connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Handle progress events
   * @param {Event} event - The SSE event
   */
  _handleProgressEvent(event) {
    this.lastEventId = event.lastEventId;
    const data = JSON.parse(event.data);
    if (this.onProgress) {
      this.onProgress(data);
    }
  }

  /**
   * Handle completion events
   * @param {Event} event - The SSE event
   */
  _handleCompleteEvent(event) {
    this.lastEventId = event.lastEventId;
    const data = JSON.parse(event.data);
    if (this.onComplete) {
      this.onComplete(data);
    }
    // Automatically close the connection on completion
    this.close();
  }

  /**
   * Handle error events
   * @param {Event} event - The SSE event
   */
  _handleErrorEvent(event) {
    this.lastEventId = event.lastEventId;
    const data = JSON.parse(event.data);
    if (this.onError) {
      this.onError(data);
    }
    // Automatically close the connection on error
    this.close();
  }

  /**
   * Handle log events
   * @param {Event} event - The SSE event
   */
  _handleLogEvent(event) {
    this.lastEventId = event.lastEventId;
    const data = JSON.parse(event.data);
    if (this.onLog) {
      this.onLog(data);
    }
  }

  /**
   * Handle status events
   * @param {Event} event - The SSE event
   */
  _handleStatusEvent(event) {
    this.lastEventId = event.lastEventId;
    const data = JSON.parse(event.data);
    if (this.onStatus) {
      this.onStatus(data);
    }
  }

  /**
   * Handle heartbeat events
   * @param {Event} event - The SSE event
   */
  _handleHeartbeatEvent(event) {
    this.lastEventId = event.lastEventId;
    // Heartbeat events are used to keep the connection alive
    // No need to do anything with them
  }
}
```

### Usage Example

```javascript
// Create a new client
const client = new ProgressNotificationClient('http://localhost:8081');

// Subscribe to progress notifications for an operation
client.subscribe('operation-123', {
  onProgress: (data) => {
    console.log(`Progress: ${data.progress}% - ${data.message}`);
    // Update UI with progress information
    document.getElementById('progress-bar').style.width = `${data.progress}%`;
    document.getElementById('progress-message').textContent = data.message;
  },
  onComplete: (data) => {
    console.log(`Operation completed: ${data.message}`);
    // Update UI to show completion
    document.getElementById('status').textContent = 'Completed';
    document.getElementById('result').textContent = data.result;
  },
  onError: (data) => {
    console.error(`Operation failed: ${data.error}`);
    // Update UI to show error
    document.getElementById('status').textContent = 'Failed';
    document.getElementById('error').textContent = data.error;
  },
  onLog: (data) => {
    console.log(`Log: [${data.level}] ${data.message}`);
    // Append log message to log container
    const logElement = document.createElement('div');
    logElement.className = `log-${data.level}`;
    logElement.textContent = `${data.message}`;
    document.getElementById('logs').appendChild(logElement);
  },
  onStatus: (data) => {
    console.log(`Status changed: ${data.previous_status} -> ${data.current_status}`);
    // Update UI to show status change
    document.getElementById('status').textContent = data.current_status;
  }
});

// Close the connection when done
// client.close();
```

## Node.js Example

For Node.js applications, you can use the `eventsource` package:

```javascript
const EventSource = require('eventsource');

class NodeProgressNotificationClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.eventSource = null;
    this.lastEventId = null;
    this.operationId = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.onLog = null;
    this.onStatus = null;
  }

  subscribe(operationId, callbacks = {}) {
    this.operationId = operationId;
    this.onProgress = callbacks.onProgress;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
    this.onLog = callbacks.onLog;
    this.onStatus = callbacks.onStatus;

    // Close existing connection if any
    this.close();

    // Create a new EventSource
    const url = `${this.baseUrl}/mcp/stream?operation_id=${operationId}`;
    const headers = {};
    if (this.lastEventId) {
      headers['Last-Event-ID'] = this.lastEventId;
    }
    
    this.eventSource = new EventSource(url, { headers });

    // Set up event listeners
    this.eventSource.addEventListener('progress', this._handleProgressEvent.bind(this));
    this.eventSource.addEventListener('complete', this._handleCompleteEvent.bind(this));
    this.eventSource.addEventListener('error', this._handleErrorEvent.bind(this));
    this.eventSource.addEventListener('log', this._handleLogEvent.bind(this));
    this.eventSource.addEventListener('status', this._handleStatusEvent.bind(this));
    this.eventSource.addEventListener('heartbeat', this._handleHeartbeatEvent.bind(this));

    // Handle connection errors
    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      // Attempt to reconnect with last event ID
      setTimeout(() => {
        this.reconnect();
      }, 5000); // Reconnect after 5 seconds
    };
  }

  // ... rest of the methods are the same as the browser example
}
```

## Python Example

For Python applications, you can use the `sseclient` package:

```python
import json
import time
import sseclient
import requests

class PythonProgressNotificationClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.last_event_id = None
        self.operation_id = None
        self.client = None
        self.callbacks = {}
    
    def subscribe(self, operation_id, callbacks=None):
        self.operation_id = operation_id
        self.callbacks = callbacks or {}
        
        # Create a new SSE client
        url = f"{self.base_url}/mcp/stream?operation_id={operation_id}"
        headers = {}
        if self.last_event_id:
            headers['Last-Event-ID'] = self.last_event_id
        
        response = requests.get(url, headers=headers, stream=True)
        self.client = sseclient.SSEClient(response)
        
        # Process events
        try:
            for event in self.client:
                self.last_event_id = event.id
                if event.event == 'progress' and 'onProgress' in self.callbacks:
                    self.callbacks['onProgress'](json.loads(event.data))
                elif event.event == 'complete' and 'onComplete' in self.callbacks:
                    self.callbacks['onComplete'](json.loads(event.data))
                    break  # End processing on completion
                elif event.event == 'error' and 'onError' in self.callbacks:
                    self.callbacks['onError'](json.loads(event.data))
                    break  # End processing on error
                elif event.event == 'log' and 'onLog' in self.callbacks:
                    self.callbacks['onLog'](json.loads(event.data))
                elif event.event == 'status' and 'onStatus' in self.callbacks:
                    self.callbacks['onStatus'](json.loads(event.data))
        except Exception as e:
            print(f"Error processing events: {e}")
            # Attempt to reconnect
            time.sleep(5)
            self.subscribe(self.operation_id, self.callbacks)
    
    def close(self):
        if self.client:
            self.client.close()
            self.client = None
```

## Go Example

For Go applications, you can use the `r3labs/sse` package:

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/r3labs/sse/v2"
)

type ProgressNotificationClient struct {
	BaseURL     string
	LastEventID string
	OperationID string
	Client      *sse.Client
	Callbacks   map[string]interface{}
}

func NewProgressNotificationClient(baseURL string) *ProgressNotificationClient {
	return &ProgressNotificationClient{
		BaseURL:   baseURL,
		Client:    sse.NewClient(baseURL),
		Callbacks: make(map[string]interface{}),
	}
}

func (c *ProgressNotificationClient) Subscribe(operationID string, callbacks map[string]interface{}) error {
	c.OperationID = operationID
	c.Callbacks = callbacks

	// Set up the client
	c.Client.Headers["Accept"] = "text/event-stream"
	if c.LastEventID != "" {
		c.Client.Headers["Last-Event-ID"] = c.LastEventID
	}

	// Subscribe to events
	url := fmt.Sprintf("/mcp/stream?operation_id=%s", operationID)
	events := make(chan *sse.Event)
	
	// Start subscription in a goroutine
	go func() {
		err := c.Client.SubscribeChan(url, events)
		if err != nil {
			log.Printf("Error subscribing to events: %v", err)
			// Attempt to reconnect
			time.Sleep(5 * time.Second)
			c.Subscribe(c.OperationID, c.Callbacks)
		}
	}()

	// Process events
	for event := range events {
		c.LastEventID = string(event.ID)
		
		switch string(event.Event) {
		case "progress":
			if callback, ok := c.Callbacks["onProgress"]; ok {
				var data map[string]interface{}
				json.Unmarshal(event.Data, &data)
				callback.(func(map[string]interface{}))(data)
			}
		case "complete":
			if callback, ok := c.Callbacks["onComplete"]; ok {
				var data map[string]interface{}
				json.Unmarshal(event.Data, &data)
				callback.(func(map[string]interface{}))(data)
			}
			return nil // End processing on completion
		case "error":
			if callback, ok := c.Callbacks["onError"]; ok {
				var data map[string]interface{}
				json.Unmarshal(event.Data, &data)
				callback.(func(map[string]interface{}))(data)
			}
			return nil // End processing on error
		case "log":
			if callback, ok := c.Callbacks["onLog"]; ok {
				var data map[string]interface{}
				json.Unmarshal(event.Data, &data)
				callback.(func(map[string]interface{}))(data)
			}
		case "status":
			if callback, ok := c.Callbacks["onStatus"]; ok {
				var data map[string]interface{}
				json.Unmarshal(event.Data, &data)
				callback.(func(map[string]interface{}))(data)
			}
		}
	}

	return nil
}

func (c *ProgressNotificationClient) Close() {
	c.Client.Unsubscribe()
}
```

## Best Practices

1. **Always store the last event ID**: This allows for reconnection and resuming the event stream from where it left off.
2. **Implement reconnection logic**: Automatically reconnect when the connection is lost.
3. **Handle all event types**: Be prepared to handle all event types, even if you don't need them all.
4. **Close the connection when done**: Always close the connection when you're done with it to free up resources.
5. **Implement error handling**: Handle errors gracefully and provide feedback to the user.