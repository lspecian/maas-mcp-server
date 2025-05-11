# Task 1: Initialize Node.js Project with TypeScript - Implementation Plan

## Overview
This document outlines the steps to implement Task 1: Initialize Node.js Project with TypeScript for the MAAS MCP Server project.

## Steps

### 1. Initialize package.json
```bash
npm init -y
```

Then modify package.json to include:
```json
{
  "name": "maas-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for Canonical MAAS API",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc -w",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["mcp", "maas", "api", "server"],
  "author": "",
  "license": "ISC"
}
```

### 2. Install TypeScript and Node.js types
```bash
npm install -D typescript @types/node
```

### 3. Generate and configure tsconfig.json
```bash
npx tsc --init
```

Then modify tsconfig.json to include:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Create the directory structure
```bash
mkdir -p src/maas src/mcp_tools src/mcp_resources src/types dist
```

### 5. Create placeholder files
Create the following files with minimal content:

#### src/index.ts
```typescript
// Main application entry point, MCP server setup
console.log('MAAS MCP Server starting...');
```

#### src/config.ts
```typescript
// Configuration management (MAAS URL, API key)
export const config = {
  maasApiUrl: process.env.MAAS_API_URL || '',
  maasApiKey: process.env.MAAS_API_KEY || ''
};
```

#### src/maas/MaasApiClient.ts
```typescript
// MAAS API interaction logic, authentication
export class MaasApiClient {
  constructor() {
    // TODO: Implement MAAS API client
  }
}
```

#### src/mcp_tools/index.ts
```typescript
// Exports all tools
export * from './listMachines';
export * from './createTag';
```

#### src/mcp_tools/listMachines.ts
```typescript
// Example tool definition
export const listMachines = {
  // TODO: Implement list machines tool
};
```

#### src/mcp_tools/createTag.ts
```typescript
// Another example tool
export const createTag = {
  // TODO: Implement create tag tool
};
```

#### src/mcp_resources/index.ts
```typescript
// Exports all resources
export * from './machineDetails';
```

#### src/mcp_resources/machineDetails.ts
```typescript
// Example resource definition
export const machineDetails = {
  // TODO: Implement machine details resource
};
```

#### src/types/index.ts
```typescript
// Custom type definitions
export interface MaasApiResponse {
  // TODO: Define MAAS API response types
}
```

### 6. Create .env.example file
```
MAAS_API_URL=https://your-maas-instance/MAAS/api/2.0/
MAAS_API_KEY=your-consumer-key:your-consumer-token:your-secret
```

## Verification
After completing the implementation, verify that:
1. The project structure matches the PRD specifications
2. package.json contains the correct configuration
3. tsconfig.json has the appropriate settings
4. A simple TypeScript compilation test works by running `npm run build`