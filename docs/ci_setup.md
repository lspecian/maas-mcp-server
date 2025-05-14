# Continuous Integration Setup for MAAS MCP Server

This document provides a quick overview of the CI setup for the MAAS MCP Server project.

## CI Pipeline Overview

The CI pipeline is configured using GitHub Actions and consists of the following stages:

1. **Lint**: Checks code style and quality for both Go and TypeScript
2. **Unit Tests**: Runs unit tests for Go and TypeScript components
3. **Mutation Tests**: Runs mutation tests to verify test quality
4. **Integration Tests**: Runs integration tests with mock MAAS
5. **End-to-End Tests**: Runs E2E tests with a containerized MAAS instance
6. **Performance Tests**: Runs performance and load tests
7. **Build**: Builds the Go server and TypeScript code

## CI Configuration Files

- `.github/workflows/ci.yml`: GitHub Actions workflow configuration
- `.go-mutesting.yaml`: Go mutation testing configuration
- `stryker.conf.json`: TypeScript mutation testing configuration
- `performance-test.js`: k6 performance test script

## Running Tests Locally

### Go Tests

```bash
# Run Go unit tests
go test -v ./test/unit/...

# Run Go integration tests
go test -v ./test/integration/...

# Run Go mutation tests
go install github.com/zimmski/go-mutesting/cmd/go-mutesting@latest
go-mutesting ./internal/models ./internal/service/resources
```

### TypeScript Tests

```bash
# Run TypeScript unit tests
npm test

# Run TypeScript integration tests
npm run test:integration

# Run TypeScript mutation tests
npm install --no-save @stryker-mutator/core @stryker-mutator/jest-runner
npx stryker run
```

### Performance Tests

```bash
# Install k6
# On Linux:
curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
sudo cp k6-v0.47.0-linux-amd64/k6 /usr/local/bin

# On macOS:
brew install k6

# Run performance tests
k6 run performance-test.js
```

## CI Pipeline Triggers

The CI pipeline is triggered on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Manual triggering via GitHub Actions UI

## Test Result Reporting

The CI pipeline reports test results in the following ways:

- **Test Reports**: Generated using the `dorny/test-reporter` GitHub Action
- **Coverage Reports**: Uploaded to Codecov
- **Mutation Test Reports**: Uploaded as artifacts
- **Performance Test Reports**: Uploaded as artifacts

## Notifications

The CI pipeline sends notifications in the following cases:

- **Pipeline Failure**: Sends a Slack notification with details about the failure
- **Test Failures**: Sends a Slack notification with details about failing tests

To receive notifications, make sure the `SLACK_WEBHOOK_URL` secret is configured in the GitHub repository.

## Testing the CI Pipeline

To test the CI pipeline:

1. Create a branch with passing tests and open a PR
2. Create a branch with failing tests and open a PR
3. Check that the CI pipeline correctly identifies issues

## Detailed Documentation

For more detailed information about the CI pipeline, see [CI Pipeline Documentation](ci_pipeline.md).