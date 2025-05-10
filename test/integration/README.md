# Integration Tests for MCP MAAS Server

This directory contains integration tests for the MCP MAAS server. These tests verify that the server correctly interacts with a MAAS instance and provides the expected API endpoints.

## Test Structure

The integration tests are organized as follows:

- `helper.go`: Contains helper functions and a test server setup for integration tests.
- `main_test.go`: Entry point for running all integration tests.
- `machine_test.go`: Tests for machine management endpoints.
- `network_test.go`: Tests for network management endpoints.
- `tag_test.go`: Tests for tag management endpoints.
- `mock/`: Contains mock implementations for testing.
  - `maas_client.go`: A mock implementation of the MAAS client.
  - `maas_server.go`: A mock implementation of the MAAS API server.

## Running the Tests

To run all integration tests:

```bash
go test -v ./test/integration/...
```

To run a specific test file:

```bash
go test -v ./test/integration/machine_test.go
```

To run a specific test:

```bash
go test -v ./test/integration -run TestListMachines
```

## Test Environment

The integration tests use a mock MAAS client and server to simulate interactions with a real MAAS instance. This allows the tests to run without requiring a real MAAS instance.

The mock client and server are initialized with test data that includes:

- Test machines with different statuses and configurations
- Test subnets and VLANs
- Test tags

## Test Coverage

The integration tests cover the following functionality:

### Machine Management

- Listing machines with and without filters
- Getting machine details
- Allocating machines with constraints
- Deploying machines
- Releasing machines
- Getting machine power state

### Network Management

- Listing subnets with and without filters
- Getting subnet details
- Listing VLANs for a fabric

### Tag Management

- Listing tags
- Creating tags
- Applying tags to machines
- Removing tags from machines

## Adding New Tests

When adding new tests, follow these guidelines:

1. Use the `TestServer` struct from `helper.go` to set up a test server.
2. Use the `MakeRequest` method to make HTTP requests to the test server.
3. Use the `ParseJSONResponse` function to parse JSON responses.
4. Use the `MockClient` field to access the mock MAAS client and set up test conditions.
5. Add assertions to verify the expected behavior.

Example:

```go
func TestNewEndpoint(t *testing.T) {
    // Set up test server
    ts := NewTestServer(t)
    defer ts.Close()

    // Make request
    resp, respBody := ts.MakeRequest(t, http.MethodGet, "/api/v1/new-endpoint", nil)

    // Verify response
    require.Equal(t, http.StatusOK, resp.StatusCode)

    var result SomeResponseType
    ParseJSONResponse(t, respBody, &result)

    // Add assertions
    assert.Equal(t, expectedValue, result.SomeField)
}