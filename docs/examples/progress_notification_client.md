# Progress Notification Client Examples

This document provides examples of how to handle progress notifications from the MAAS MCP Server in different client environments.

## Overview

Progress notifications are sent from the server to the client during long-running operations. These notifications provide real-time updates about the operation's progress, allowing clients to display progress indicators, status messages, and handle errors appropriately.

## Browser Client Examples

### Basic Example with Fetch API

```javascript
// Function to handle progress notifications
function handleProgressNotification(notification) {
  const { progressToken, progress, total, message } = notification.params;
  
  // Update UI with progress information
  const percentComplete = Math.round((progress / total) * 100);
  console.log(`Operation ${progressToken}: ${percentComplete}% - ${message}`);
  
  // Update progress bar
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percentComplete}%`;
    progressBar.setAttribute('aria-valuenow', percentComplete);
  }
  
  // Update status message
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
  }
  
  // Check if operation is complete
  if (progress === total) {
    console.log(`Operation ${progressToken} completed!`);
    // Perform any cleanup or UI updates for completion
  }
}

// Function to deploy a machine with progress notifications
async function deployMachineWithProgress(machineId, osystem, distroSeries) {
  // Generate a unique progress token
  const progressToken = `deploy-${machineId}-${Date.now()}`;
  
  try {
    // Set up SSE connection for notifications
    const eventSource = new EventSource('/api/notifications/sse');
    
    eventSource.addEventListener('message', (event) => {
      const notification = JSON.parse(event.data);
      
      // Check if this is a progress notification for our operation
      if (notification.method === 'notifications/progress' && 
          notification.params.progressToken === progressToken) {
        handleProgressNotification(notification);
        
        // Close the connection when the operation is complete
        if (notification.params.progress === notification.params.total) {
          eventSource.close();
        }
      }
    });
    
    // Make the API request with the progress token
    const response = await fetch('/api/tools/maas_deploy_machine_with_progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_id: machineId,
        osystem: osystem,
        distro_series: distroSeries,
        _meta: {
          progressToken: progressToken
        }
      })
    });
    
    // Handle the response
    if (!response.ok) {
      throw new Error(`Deployment failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Deployment error:', error);
    throw error;
  }
}

// Usage example
document.getElementById('deploy-button').addEventListener('click', async () => {
  const machineId = document.getElementById('machine-id').value;
  const osystem = document.getElementById('osystem').value;
  const distroSeries = document.getElementById('distro-series').value;
  
  try {
    // Show progress UI
    document.getElementById('progress-container').style.display = 'block';
    
    // Start deployment
    const result = await deployMachineWithProgress(machineId, osystem, distroSeries);
    
    // Handle successful result
    console.log('Deployment result:', result);
  } catch (error) {
    // Handle error
    console.error('Deployment failed:', error);
    document.getElementById('status-message').textContent = `Error: ${error.message}`;
  }
});
```

### React Example

```jsx
import React, { useState, useEffect } from 'react';

// Progress notification hook
function useProgressNotification(progressToken) {
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(100);
  const [message, setMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!progressToken) return;
    
    // Set up SSE connection
    const eventSource = new EventSource('/api/notifications/sse');
    
    const handleMessage = (event) => {
      const notification = JSON.parse(event.data);
      
      // Check if this is a progress notification for our operation
      if (notification.method === 'notifications/progress' && 
          notification.params.progressToken === progressToken) {
        
        const { progress, total, message } = notification.params;
        
        setProgress(progress);
        setTotal(total);
        setMessage(message);
        
        // Check for completion or error
        if (progress === total) {
          setIsComplete(true);
          eventSource.close();
        }
        
        // Check for error message
        if (message.toLowerCase().includes('error') || 
            message.toLowerCase().includes('failed') ||
            message.toLowerCase().includes('aborted')) {
          setError(message);
          eventSource.close();
        }
      }
    };
    
    eventSource.addEventListener('message', handleMessage);
    
    // Clean up on unmount
    return () => {
      eventSource.removeEventListener('message', handleMessage);
      eventSource.close();
    };
  }, [progressToken]);
  
  return { progress, total, message, isComplete, error };
}

// Machine deployment component
function MachineDeployment({ machineId, osystem, distroSeries }) {
  const [progressToken, setProgressToken] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState(null);
  
  // Use our progress notification hook
  const { progress, total, message, isComplete, error } = useProgressNotification(progressToken);
  
  // Calculate percentage
  const percentComplete = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  // Start deployment
  const startDeployment = async () => {
    // Generate a unique progress token
    const token = `deploy-${machineId}-${Date.now()}`;
    setProgressToken(token);
    setIsDeploying(true);
    
    try {
      // Make the API request
      const response = await fetch('/api/tools/maas_deploy_machine_with_progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_id: machineId,
          osystem: osystem,
          distro_series: distroSeries,
          _meta: {
            progressToken: token
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setDeploymentResult(result);
    } catch (error) {
      console.error('Deployment error:', error);
    }
  };
  
  return (
    <div>
      <h2>Deploy Machine {machineId}</h2>
      
      {!isDeploying ? (
        <button onClick={startDeployment}>Start Deployment</button>
      ) : (
        <div className="progress-container">
          <div className="progress">
            <div 
              className="progress-bar" 
              role="progressbar" 
              style={{ width: `${percentComplete}%` }}
              aria-valuenow={percentComplete} 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
              {percentComplete}%
            </div>
          </div>
          
          <div className="status-message">
            {error ? (
              <div className="error">{error}</div>
            ) : (
              <div>{message}</div>
            )}
          </div>
          
          {isComplete && !error && (
            <div className="success-message">
              Deployment completed successfully!
            </div>
          )}
          
          {deploymentResult && (
            <div className="result">
              <h3>Deployment Result:</h3>
              <pre>{JSON.stringify(deploymentResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MachineDeployment;
```

## Node.js Client Examples

### Basic Node.js Client

```javascript
const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Function to handle progress notifications
function handleProgressNotification(notification) {
  const { progressToken, progress, total, message } = notification.params;
  
  // Calculate percentage
  const percentComplete = Math.round((progress / total) * 100);
  
  // Log progress
  console.log(`Operation ${progressToken}: ${percentComplete}% - ${message}`);
  
  // Update progress bar in terminal
  const progressBar = '='.repeat(Math.floor(percentComplete / 2)) + ' '.repeat(50 - Math.floor(percentComplete / 2));
  process.stdout.write(`\r[${progressBar}] ${percentComplete}% - ${message}`);
  
  // Add newline on completion
  if (progress === total) {
    process.stdout.write('\n');
    console.log(`Operation ${progressToken} completed!`);
  }
}

// Function to deploy a machine with progress notifications
async function deployMachineWithProgress(machineId, osystem, distroSeries) {
  // Generate a unique progress token
  const progressToken = `deploy-${machineId}-${Date.now()}`;
  
  // Set up SSE connection for notifications
  const eventSource = new EventSource('http://localhost:3000/api/notifications/sse');
  
  eventSource.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    
    // Check if this is a progress notification for our operation
    if (notification.method === 'notifications/progress' && 
        notification.params.progressToken === progressToken) {
      handleProgressNotification(notification);
      
      // Close the connection when the operation is complete
      if (notification.params.progress === notification.params.total) {
        eventSource.close();
      }
    }
  };
  
  try {
    // Make the API request with the progress token
    const response = await fetch('http://localhost:3000/api/tools/maas_deploy_machine_with_progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_id: machineId,
        osystem: osystem,
        distro_series: distroSeries,
        _meta: {
          progressToken: progressToken
        }
      })
    });
    
    // Handle the response
    if (!response.ok) {
      throw new Error(`Deployment failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Deployment error:', error);
    eventSource.close();
    throw error;
  }
}

// Usage example
async function main() {
  try {
    console.log('Starting machine deployment...');
    
    const result = await deployMachineWithProgress('abc123', 'ubuntu', 'jammy');
    
    console.log('Deployment result:', result);
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

main();
```

### TypeScript Client with Abort Support

```typescript
import fetch from 'node-fetch';
import EventSource from 'eventsource';

interface ProgressNotification {
  method: string;
  params: {
    progressToken: string;
    progress: number;
    total: number;
    message: string;
  };
}

interface DeployOptions {
  machineId: string;
  osystem?: string;
  distroSeries?: string;
  userData?: string;
  enableHwSync?: boolean;
  abortSignal?: AbortSignal;
  onProgress?: (progress: number, total: number, message: string) => void;
}

class MaasClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  /**
   * Deploy a machine with progress notifications
   */
  async deployMachineWithProgress(options: DeployOptions): Promise<any> {
    const { 
      machineId, 
      osystem, 
      distroSeries, 
      userData, 
      enableHwSync,
      abortSignal,
      onProgress 
    } = options;
    
    // Generate a unique progress token
    const progressToken = `deploy-${machineId}-${Date.now()}`;
    
    // Set up SSE connection for notifications
    const eventSource = new EventSource(`${this.baseUrl}/api/notifications/sse`);
    
    // Handle abort signal
    if (abortSignal) {
      if (abortSignal.aborted) {
        eventSource.close();
        throw new Error('Operation aborted');
      }
      
      abortSignal.addEventListener('abort', () => {
        console.log('Aborting deployment operation...');
        eventSource.close();
      });
    }
    
    // Set up message handler
    eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data) as ProgressNotification;
      
      // Check if this is a progress notification for our operation
      if (notification.method === 'notifications/progress' && 
          notification.params.progressToken === progressToken) {
        
        const { progress, total, message } = notification.params;
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(progress, total, message);
        } else {
          // Default progress handling
          const percentComplete = Math.round((progress / total) * 100);
          const progressBar = '='.repeat(Math.floor(percentComplete / 2)) + ' '.repeat(50 - Math.floor(percentComplete / 2));
          process.stdout.write(`\r[${progressBar}] ${percentComplete}% - ${message}`);
          
          if (progress === total) {
            process.stdout.write('\n');
          }
        }
        
        // Close the connection when the operation is complete
        if (progress === total) {
          eventSource.close();
        }
      }
    };
    
    try {
      // Prepare request payload
      const payload = {
        system_id: machineId,
        _meta: {
          progressToken: progressToken
        }
      } as any;
      
      // Add optional parameters
      if (osystem) payload.osystem = osystem;
      if (distroSeries) payload.distro_series = distroSeries;
      if (userData) payload.user_data = userData;
      if (enableHwSync !== undefined) payload.enable_hw_sync = enableHwSync;
      
      // Make the API request with the progress token
      const response = await fetch(`${this.baseUrl}/api/tools/maas_deploy_machine_with_progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: abortSignal
      });
      
      // Handle the response
      if (!response.ok) {
        eventSource.close();
        throw new Error(`Deployment failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      eventSource.close();
      
      // Check if this is an abort error
      if (error.name === 'AbortError') {
        throw new Error('Deployment operation was aborted');
      }
      
      throw error;
    }
  }
}

// Usage example
async function main() {
  // Create a client
  const client = new MaasClient('http://localhost:3000', 'your-api-key');
  
  // Create an abort controller for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minute timeout
  
  try {
    console.log('Starting machine deployment...');
    
    const result = await client.deployMachineWithProgress({
      machineId: 'abc123',
      osystem: 'ubuntu',
      distroSeries: 'jammy',
      abortSignal: controller.signal,
      onProgress: (progress, total, message) => {
        const percentComplete = Math.round((progress / total) * 100);
        console.log(`Deployment progress: ${percentComplete}% - ${message}`);
      }
    });
    
    console.log('Deployment result:', result);
  } catch (error) {
    console.error('Deployment failed:', error);
  } finally {
    clearTimeout(timeout);
  }
}

main();
```

## Error Handling Examples

### Handling Common Error Scenarios

```javascript
// Function to deploy a machine with comprehensive error handling
async function deployMachineWithErrorHandling(machineId, osystem, distroSeries) {
  // Generate a unique progress token
  const progressToken = `deploy-${machineId}-${Date.now()}`;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Operation timed out'), 10 * 60 * 1000); // 10 minute timeout
  
  // Set up SSE connection for notifications
  let eventSource;
  let eventSourceClosed = false;
  
  try {
    eventSource = new EventSource('/api/notifications/sse');
    
    // Promise for handling notifications
    const notificationPromise = new Promise((resolve, reject) => {
      let lastProgress = 0;
      let lastMessage = '';
      
      eventSource.addEventListener('message', (event) => {
        const notification = JSON.parse(event.data);
        
        // Check if this is a progress notification for our operation
        if (notification.method === 'notifications/progress' && 
            notification.params.progressToken === progressToken) {
          
          const { progress, total, message } = notification.params;
          
          // Update progress tracking
          lastProgress = progress;
          lastMessage = message;
          
          // Display progress
          const percentComplete = Math.round((progress / total) * 100);
          console.log(`Operation ${progressToken}: ${percentComplete}% - ${message}`);
          
          // Check for error messages
          if (message.toLowerCase().includes('error') || 
              message.toLowerCase().includes('failed') ||
              message.toLowerCase().includes('aborted')) {
            reject(new Error(message));
            closeEventSource();
          }
          
          // Check for completion
          if (progress === total) {
            resolve({ progress, total, message });
            closeEventSource();
          }
        }
      });
      
      eventSource.addEventListener('error', (error) => {
        reject(new Error('EventSource connection failed'));
        closeEventSource();
      });
      
      // Handle no notifications after 30 seconds
      const noActivityTimeout = setTimeout(() => {
        if (lastProgress === 0) {
          reject(new Error('No progress notifications received'));
        } else {
          reject(new Error(`Operation stalled at ${lastProgress}%: ${lastMessage}`));
        }
        closeEventSource();
      }, 30000);
      
      // Function to close event source
      function closeEventSource() {
        if (!eventSourceClosed) {
          clearTimeout(noActivityTimeout);
          eventSource.close();
          eventSourceClosed = true;
        }
      }
    });
    
    // Make the API request with the progress token
    const fetchPromise = fetch('/api/tools/maas_deploy_machine_with_progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_id: machineId,
        osystem: osystem,
        distro_series: distroSeries,
        _meta: {
          progressToken: progressToken
        }
      }),
      signal: controller.signal
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }
      return response.json();
    });
    
    // Race the fetch and notification promises
    const [result, progressResult] = await Promise.all([fetchPromise, notificationPromise]);
    
    return result;
  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      console.error('Deployment timed out');
    } else if (error.message.includes('EventSource')) {
      console.error('Notification connection failed');
    } else if (error.message.includes('stalled')) {
      console.error('Deployment stalled');
    } else {
      console.error('Deployment error:', error);
    }
    
    // Try to abort the operation on the server
    try {
      await fetch(`/api/operations/${progressToken}/abort`, {
        method: 'POST'
      });
      console.log('Sent abort request to server');
    } catch (abortError) {
      console.error('Failed to abort operation:', abortError);
    }
    
    throw error;
  } finally {
    // Clean up
    clearTimeout(timeoutId);
    if (eventSource && !eventSourceClosed) {
      eventSource.close();
    }
  }
}
```

## Conclusion

These examples demonstrate how to handle progress notifications in different client environments. The key points to remember are:

1. Generate a unique `progressToken` for each operation
2. Set up a notification channel (e.g., SSE) to receive updates
3. Handle progress updates to update the UI or log progress
4. Implement proper error handling for different scenarios
5. Clean up resources when the operation completes or fails

By following these patterns, you can provide a better user experience for long-running operations in your application.