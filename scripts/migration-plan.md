# Migration Plan: Express.js to FastMCP

This document outlines the technical steps to migrate the MAAS MCP Server from Express.js to FastMCP.

## Preparation

### 1. Set Up Development Environment

```bash
# Create a new branch for the migration
git checkout -b fastmcp-migration

# Install FastMCP
npm install fastmcp@latest --save
```

### 2. Create Project Structure

Create a parallel implementation structure to allow for side-by-side development:

```
src/
├── current/        # Current Express.js implementation (renamed from existing files)
└── fastmcp/        # New FastMCP implementation
    ├── server.ts   # Main FastMCP server
    ├── tools/      # Migrated tools
    ├── resources/  # Migrated resources
    ├── middleware/ # Custom middleware for FastMCP
    └── utils/      # Utilities and helpers
```

### 3. Set Up Configuration

Create a configuration module that works with both implementations:

```typescript
// src/config.ts
export interface Config {
  maasApiUrl: string;
  maasApiKey: string;
  mcpPort: number;
  mcpProtocolVersion: string;
  mcpUseLatestProtocol: boolean;
  cacheEnabled: boolean;
  cacheStrategy: 'time-based' | 'lru';
  cacheMaxSize: number;
  cacheMaxAge: number;
  auditLogEnabled: boolean;
  // ... other configuration options
}

export function loadConfig(): Config {
  return {
    maasApiUrl: process.env.MAAS_API_URL || '',
    maasApiKey: process.env.MAAS_API_KEY || '',
    mcpPort: parseInt(process.env.MCP_PORT || '3000', 10),
    mcpProtocolVersion: process.env.MCP_PROTOCOL_VERSION || '2024-11-05',
    mcpUseLatestProtocol: process.env.MCP_USE_LATEST_PROTOCOL === 'true',
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheStrategy: (process.env.CACHE_STRATEGY || 'time-based') as 'time-based' | 'lru',
    cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE || '300', 10),
    auditLogEnabled: process.env.AUDIT_LOG_ENABLED !== 'false',
    // ... other configuration options
  };
}
```

## Phase 1: Core Server Implementation

### 1. Create Basic FastMCP Server

```typescript
// src/fastmcp/server.ts
import { FastMCP } from 'fastmcp';
import { loadConfig } from '../config';

export async function createServer() {
  const config = loadConfig();
  
  // Create the FastMCP server
  const server = new FastMCP({
    name: "MAAS-API-MCP-Server",
    version: "1.0.0",
    serverInfo: {
      name: "Canonical MAAS API Bridge for MCP",
      version: "0.1.0",
      instructions: "This MCP server provides access to Canonical MAAS API functionality."
    },
    port: config.mcpPort,
    protocolVersion: config.mcpUseLatestProtocol ? 'latest' : config.mcpProtocolVersion
  });
  
  // Add health endpoint
  server.addHttpEndpoint('GET', '/health', async (req, res) => {
### 2. Create Entry Point

```typescript
// src/fastmcp/index.ts
import { createServer } from './server';
import { registerTools } from './tools';
import { registerResources } from './resources';
import { setupMiddleware } from './middleware';
import { loadConfig } from '../config';

async function start() {
  try {
    const config = loadConfig();
    
    // Create the server
    const server = await createServer();
    
    // Set up middleware
    setupMiddleware(server);
    
    // Register tools and resources
    registerTools(server);
    registerResources(server);
    
    // Start the server
    await server.start();
    console.log(`FastMCP Server running on http://localhost:${config.mcpPort}/mcp`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { start };
```

### 3. Create Middleware Setup

```typescript
// src/fastmcp/middleware/index.ts
import { FastMCP } from 'fastmcp';
import { setupAuditLogging } from './auditLogging';
import { setupCaching } from './caching';
import { setupErrorHandling } from './errorHandling';

export function setupMiddleware(server: FastMCP) {
  // Set up audit logging middleware
  setupAuditLogging(server);
  
  // Set up caching middleware
  setupCaching(server);
  
  // Set up error handling middleware
  setupErrorHandling(server);
}
```

## Phase 2: Tool Migration

### 1. Create Tool Registration Module

```typescript
// src/fastmcp/tools/index.ts
import { FastMCP } from 'fastmcp';
import { registerListMachines } from './listMachines';
import { registerListSubnets } from './listSubnets';
// Import other tool registration functions

export function registerTools(server: FastMCP) {
  // Register all tools
  registerListMachines(server);
  registerListSubnets(server);
  // Register other tools
}
```

### 2. Migrate a Simple Tool (Example)

```typescript
// src/fastmcp/tools/listMachines.ts
import { FastMCP } from 'fastmcp';
import { MaasApiClient } from '../../maas/MaasApiClient';

export function registerListMachines(server: FastMCP) {
  const maasApiClient = new MaasApiClient();
  
  server.registerTool({
    name: 'maas_list_machines',
    description: 'List machines from the MAAS API with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        hostname: {
          type: 'string',
          description: 'Filter by hostname'
        },
        status: {
          type: 'string',
          description: 'Filter by status'
        }
      }
    },
    handler: async (params) => {
      try {
        // Build query parameters
        const queryParams = {};
        if (params.hostname) queryParams.hostname = params.hostname;
        if (params.status) queryParams.status = params.status;
        
        // Call the MAAS API
        const machines = await maasApiClient.get('/machines/', queryParams);
        
        // Transform the response
        return {
          machines: machines.map(machine => ({
            system_id: machine.system_id,
            hostname: machine.hostname,
            status: machine.status_name,
            owner: machine.owner || null,
            architecture: machine.architecture,
            cpu_count: machine.cpu_count,
            memory: machine.memory,
            zone: {
              name: machine.zone.name
            },
            pool: {
              name: machine.pool.name
            },
            ip_addresses: machine.ip_addresses,
            tags: machine.tag_names || []
          })),
          count: machines.length
        };
      } catch (error) {
        console.error('Error listing machines:', error);
        throw new Error(`Failed to list machines: ${error.message}`);
      }
    }
  });
}
```
    res.json({ status: 'ok' });
  });
  
  // Add direct API endpoint
  server.addHttpEndpoint('GET', '/api/machines', async (req, res) => {
    // Implementation will be added later
    res.json({ machines: [], count: 0 });
  });
  
  return server;
}
### 3. Migrate a Complex Tool with Progress Notifications (Example)

```typescript
// src/fastmcp/tools/deployMachineWithProgress.ts
import { FastMCP } from 'fastmcp';
import { MaasApiClient } from '../../maas/MaasApiClient';
import { ProgressNotifier } from '../utils/progressNotifier';

export function registerDeployMachineWithProgress(server: FastMCP) {
  const maasApiClient = new MaasApiClient();
  
  server.registerTool({
    name: 'maas_deploy_machine_with_progress',
    description: 'Deploy an operating system to a machine with progress notifications',
    inputSchema: {
      type: 'object',
      required: ['system_id', 'os', 'progressToken'],
      properties: {
        system_id: {
          type: 'string',
          description: 'The system ID of the machine to deploy'
        },
        os: {
          type: 'string',
          description: 'The operating system to deploy'
        },
        progressToken: {
          type: 'string',
          description: 'Token for progress notifications'
        }
      }
    },
    handler: async (params, context) => {
      // Create a progress notifier
      const progressNotifier = new ProgressNotifier(server, params.progressToken);
      
      try {
        // Send initial progress notification
        await progressNotifier.notify(0, 'Starting deployment');
        
        // Call the MAAS API to start deployment
        const deployResult = await maasApiClient.post(`/machines/${params.system_id}/`, {
          action: 'deploy',
          osystem: params.os
        });
        
        await progressNotifier.notify(10, 'Deployment initiated');
        
        // Poll for deployment status
        let status = 'Deploying';
        let progress = 10;
        
        while (status === 'Deploying' && progress < 100) {
          // Wait for a bit
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check deployment status
          const machineStatus = await maasApiClient.get(`/machines/${params.system_id}/`);
          
          // Update status and progress
          status = machineStatus.status_name;
          progress = status === 'Deployed' ? 100 : Math.min(progress + 10, 90);
          
          // Send progress notification
          await progressNotifier.notify(
            progress, 
            status === 'Deployed' ? 'Deployment complete' : `Deploying: ${progress}% complete`
          );
          
          // Check if the operation was aborted
          if (context.signal?.aborted) {
            await maasApiClient.post(`/machines/${params.system_id}/`, {
              action: 'abort'
            });
            throw new Error('Deployment aborted');
          }
        }
        
        // Final notification
        if (status === 'Deployed') {
          await progressNotifier.notify(100, 'Deployment complete');
          return { success: true, system_id: params.system_id, status };
        } else {
          throw new Error(`Deployment failed: ${status}`);
        }
      } catch (error) {
        // Send error notification
        await progressNotifier.notifyError(`Deployment failed: ${error.message}`);
        throw error;
      }
    }
  });
}
```

## Phase 3: Resource Migration

### 1. Create Resource Registration Module

```typescript
// src/fastmcp/resources/index.ts
import { FastMCP } from 'fastmcp';
import { registerMachineDetails } from './machineDetails';
import { registerSubnetDetails } from './subnetDetails';
// Import other resource registration functions

export function registerResources(server: FastMCP) {
  // Register all resources
  registerMachineDetails(server);
  registerSubnetDetails(server);
  // Register other resources
}
```

### 2. Migrate a Resource (Example)

```typescript
// src/fastmcp/resources/machineDetails.ts
import { FastMCP } from 'fastmcp';
import { MaasApiClient } from '../../maas/MaasApiClient';

export function registerMachineDetails(server: FastMCP) {
  const maasApiClient = new MaasApiClient();
  
  server.registerResource({
    uriPattern: 'maas://machine/{system_id}/details',
    description: 'Get detailed information about a specific machine',
    handler: async (uri, context) => {
      try {
        // Extract system_id from URI
        const systemId = uri.params.system_id;
        
        if (!systemId) {
          throw new Error('System ID is required');
        }
        
        // Call the MAAS API
        const machine = await maasApiClient.get(`/machines/${systemId}/`);
        
        // Transform the response
        return {
          system_id: machine.system_id,
          hostname: machine.hostname,
          status: machine.status_name,
          owner: machine.owner || null,
          architecture: machine.architecture,
          cpu_count: machine.cpu_count,
          memory: machine.memory,
          storage: machine.storage,
          network_interfaces: machine.interface_set.map(iface => ({
            id: iface.id,
            name: iface.name,
            type: iface.type,
            mac_address: iface.mac_address,
            ip_addresses: iface.links.map(link => link.ip_address)
          })),
          zone: {
            name: machine.zone.name
          },
          pool: {
            name: machine.pool.name
          },
          tags: machine.tag_names || [],
          power_state: machine.power_state,
          last_updated: machine.last_updated
        };
      } catch (error) {
        console.error(`Error fetching machine details for ${uri.params.system_id}:`, error);
        throw new Error(`Failed to fetch machine details: ${error.message}`);
      }
    }
  });
}
```