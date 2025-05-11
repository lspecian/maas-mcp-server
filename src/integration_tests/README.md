# MAAS MCP Server Integration Tests

This directory contains integration tests for the MAAS MCP Server. These tests verify the end-to-end flow from MCP client to server to MAAS API and back, with mocked MAAS API responses.

## Directory Structure

- `setup/`: Test server setup utilities and common test configurations
  - `testServerSetup.ts`: Utilities for setting up a test server environment
  - `jest.setup.js`: Jest configuration for integration tests
- `mocks/`: Mock implementations for MAAS API responses
  - `mockMaasApiClient.ts`: Mock MAAS API client for integration tests
- `client_server/`: Tests for client-server communication
  - `clientServerCommunication.test.ts`: Tests for HTTP transport and MCP client integration
- `error_handling/`: Tests for error scenarios
  - `errorScenarios.test.ts`: Tests for various error conditions
- `machine_management/`: Tests for machine management features
  - `machineManagement.test.ts`: Tests for machine listing, deployment, and commissioning
- `network_configuration/`: Tests for network configuration features
  - `networkConfiguration.test.ts`: Tests for subnet, VLAN, and interface management
- `ci/`: CI/CD pipeline configuration
  - `github-workflow.yml`: GitHub Actions workflow for running integration tests
- `jest.integration.config.js`: Jest configuration for integration tests

## Testing Approach

The integration tests use a combination of real and mocked components:

1. **Real Components**:
   - MCP Server: A real MCP server instance is created for each test
   - HTTP Transport: Real HTTP transport is used to communicate with the server
   - Request/Response Handling: Real request and response handling is tested

2. **Mocked Components**:
   - MAAS API Client: The MAAS API client is mocked to avoid making real API calls
   - MCP Client: The MCP client is mocked to simplify testing

This approach allows us to test the full request-response cycle while controlling the MAAS API responses.

## Test Categories

1. **Client-Server Communication Tests**:
   - Verify that the MCP client can communicate with the server
   - Test API endpoint accessibility
   - Verify correct request formatting and response handling

2. **Error Scenario Tests**:
   - Test network failure scenarios
   - Simulate MAAS API errors
   - Verify proper error handling

3. **Machine Management Tests**:
   - Test machine listing functionality
   - Verify machine deployment and commissioning
   - Test machine details retrieval

4. **Network Configuration Tests**:
   - Test subnet management
   - Verify VLAN and DHCP configuration
   - Test interface management

## Running the Tests

To run the integration tests:

```bash
npm run test:integration
```

To run a specific test file:

```bash
npx jest --config src/integration_tests/jest.integration.config.js path/to/test/file.test.ts
```

To run the tests with a test report:

```bash
npm run test:report
```

## CI/CD Integration

The integration tests are configured to run in a CI/CD pipeline using GitHub Actions. The workflow is defined in `ci/github-workflow.yml`.

The workflow:
1. Runs on push to main/master and on pull requests
2. Sets up Node.js
3. Installs dependencies
4. Builds the project
5. Runs the integration tests
6. Generates a test report
7. Uploads the test results as artifacts

## Adding New Tests

When adding new integration tests:

1. Create a new test file in the appropriate directory
2. Import the necessary utilities from `setup/testServerSetup.ts`
3. Use the `setupTestServer` function to create a test environment
4. Write tests that verify the end-to-end flow
5. Clean up the test environment after each test

Example:

```typescript
import { setupTestServer, TestServerEnvironment, createToolCallRequest } from '../setup/testServerSetup.js';

describe('My Feature', () => {
  let testEnv: TestServerEnvironment;
  
  beforeAll(async () => {
    testEnv = await setupTestServer();
  });
  
  afterAll(async () => {
    await testEnv.cleanup();
  });
  
  it('should do something', async () => {
    const response = await testEnv.request
      .post('/mcp')
      .send(createToolCallRequest('my_tool', { param: 'value' }));
    
    expect(response.status).toBe(200);
    expect(response.body.isError).toBeFalsy();
  });
});