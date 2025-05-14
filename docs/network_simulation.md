# Enhanced Network Simulation Features

This document describes the enhanced network simulation features available in the mock MAAS API client for testing. These features allow developers to simulate various network conditions and error states to ensure their code is robust and can handle real-world scenarios.

## Overview

The mock MAAS API client now includes the following enhanced network simulation features:

1. **Variable Latency**: Simulate latency that varies based on response size
2. **Bandwidth Limitations**: Simulate limited network bandwidth
3. **Connection Drops**: Simulate random connection drops during request processing
4. **Progressive Degradation**: Simulate service that gradually slows down over time
5. **Geographic Latency**: Simulate latency based on geographic location

These features can be used individually or combined to create realistic network conditions for testing.

## Configuration Options

### Variable Latency

Simulates latency that increases with the size of the response data.

```typescript
const mockClient = createMockMaasApiClient({
  simulateVariableLatency: true,
  latencyPerKb: 10 // 10ms per KB of data
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulateVariableLatency` | boolean | false | Enable variable latency simulation |
| `latencyPerKb` | number | 10 | Milliseconds of latency to add per KB of data |

### Bandwidth Limitations

Simulates a network connection with limited bandwidth.

```typescript
const mockClient = createMockMaasApiClient({
  simulateBandwidthLimits: true,
  bandwidthKBps: 100 // 100 KB/s
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulateBandwidthLimits` | boolean | false | Enable bandwidth limitation simulation |
| `bandwidthKBps` | number | 100 | Simulated bandwidth in KB per second |

### Connection Drops

Simulates random connection drops during request processing.

```typescript
const mockClient = createMockMaasApiClient({
  simulateConnectionDrops: true,
  connectionDropProbability: 0.05 // 5% chance of connection drop
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulateConnectionDrops` | boolean | false | Enable connection drop simulation |
| `connectionDropProbability` | number | 0.05 | Probability (0-1) of a connection drop |

### Progressive Degradation

Simulates a service that gradually slows down over time, such as a system under increasing load.

```typescript
const mockClient = createMockMaasApiClient({
  simulateProgressiveDegradation: true,
  degradationFactor: 1.1, // 10% increase in latency per request
  maxDegradationMultiplier: 10 // Maximum 10x slowdown
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulateProgressiveDegradation` | boolean | false | Enable progressive degradation simulation |
| `degradationFactor` | number | 1.1 | Factor by which to increase delay with each request |
| `maxDegradationMultiplier` | number | 10 | Maximum degradation multiplier to prevent infinite slowdown |

### Geographic Latency

Simulates latency based on geographic location.

```typescript
const mockClient = createMockMaasApiClient({
  simulateGeographicLatency: true,
  geographicLocation: 'continental', // Options: 'local', 'regional', 'continental', 'global'
  geographicLatencyMap: {
    local: 10,
    regional: 50,
    continental: 100,
    global: 300
  }
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `simulateGeographicLatency` | boolean | false | Enable geographic latency simulation |
| `geographicLocation` | string | 'local' | Simulated geographic location |
| `geographicLatencyMap` | object | See below | Latency map for different geographic locations in milliseconds |

Default geographic latency map:
```typescript
{
  local: 10,      // 10ms for local connections
  regional: 50,   // 50ms for regional connections
  continental: 100, // 100ms for continental connections
  global: 300     // 300ms for global connections
}
```

## Predefined Configurations

For convenience, several predefined configurations are available:

```typescript
// Variable latency based on response size
const client1 = mockClientConfigs.variableLatency();

// Limited bandwidth
const client2 = mockClientConfigs.limitedBandwidth(50); // 50 KB/s

// Connection drops
const client3 = mockClientConfigs.connectionDrops(0.2); // 20% drop probability

// Progressive degradation
const client4 = mockClientConfigs.progressiveDegradation();

// Geographic latency
const client5 = mockClientConfigs.geographicLatency('global');

// Realistic network conditions (combines multiple features)
const client6 = mockClientConfigs.realisticNetwork();
```

## Example Usage

Here's an example of how to use these features in tests:

```typescript
import { createMockMaasApiClient, mockClientConfigs } from '../mocks/mockMaasApiClient.js';

describe('Network Resilience Tests', () => {
  it('should handle connection drops with retry logic', async () => {
    // Create a mock client with connection drops
    const mockClient = mockClientConfigs.connectionDrops(0.5); // 50% drop probability
    
    // Implement retry logic
    const retryRequest = async (maxRetries = 3) => {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          return await mockClient.get('/endpoint');
        } catch (error) {
          if (error instanceof MaasApiError && error.message.includes('Connection dropped')) {
            retries++;
            console.log(`Connection dropped, retry attempt ${retries}/${maxRetries}`);
            if (retries >= maxRetries) throw error;
          } else {
            throw error;
          }
        }
      }
    };
    
    // Test the retry logic
    const result = await retryRequest();
    expect(result).toBeDefined();
  });
});
```

## Combining Features

Multiple network simulation features can be combined to create more complex scenarios:

```typescript
const mockClient = createMockMaasApiClient({
  // Base network delay
  simulateNetworkDelay: 100,
  networkJitterMs: 50,
  
  // Variable latency based on response size
  simulateVariableLatency: true,
  latencyPerKb: 10,
  
  // Occasional connection drops
  simulateConnectionDrops: true,
  connectionDropProbability: 0.05,
  
  // Progressive degradation
  simulateProgressiveDegradation: true,
  degradationFactor: 1.05
});
```

## Implementation Details

These network simulation features are implemented in the mock MAAS API client by intercepting requests and applying various transformations and delays before returning responses. The implementation can be found in `src/__tests__/mocks/mockMaasApiClient.ts`.

For more examples of how to use these features, see the integration tests in `src/integration_tests/network_simulation/enhancedNetworkSimulation.test.ts`.