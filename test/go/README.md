# Go Tests Directory

This directory contains Go test files for the MAAS MCP Server project.

## Contents

- `test-stdio-client.go` - A test client for the stdio protocol

## Purpose

These tests are written in Go and test specific aspects of the MAAS MCP Server that are best tested using Go. The stdio client test, for example, tests the stdio protocol implementation directly in Go, which allows for more precise control and testing of the protocol.

## Building and Running

To build and run the stdio client test:

```bash
# Build the test
go build -o test/go/test-stdio-client test/go/test-stdio-client.go

# Run the test
./test/go/test-stdio-client
```

## Integration with Other Tests

These Go tests can be used in conjunction with the JavaScript tests to provide comprehensive test coverage. For example, the stdio client test can be used to test the server's stdio protocol implementation, while the JavaScript tests can test the server's HTTP API.