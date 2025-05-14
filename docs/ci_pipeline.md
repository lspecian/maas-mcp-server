# CI Pipeline Documentation

This document explains how to interpret CI results and fix common issues with the MAAS MCP Server continuous integration pipeline.

## CI Pipeline Overview

Our CI pipeline consists of the following stages:

1. **Lint**: Checks code style and quality for both Go and TypeScript
2. **Unit Tests**: Runs unit tests for Go and TypeScript components
3. **Mutation Tests**: Runs mutation tests to verify test quality
4. **Integration Tests**: Runs integration tests with mock MAAS
5. **End-to-End Tests**: Runs E2E tests with a containerized MAAS instance
6. **Performance Tests**: Runs performance and load tests
7. **Build**: Builds the Go server and TypeScript code

## Pipeline Workflow

The CI pipeline is triggered on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Manual triggering via GitHub Actions UI

The pipeline runs jobs in the following order:
1. Lint
2. Unit Tests (Go and TypeScript in parallel)
3. Mutation Tests (after respective unit tests)
4. Integration Tests (after unit tests)
5. End-to-End Tests (after integration tests)
6. Performance Tests (after E2E tests)
7. Build (after all tests)

## Interpreting CI Results

### Test Reports

- **Unit Test Reports**: Shows test coverage and failing tests
- **Mutation Test Reports**: Shows mutation score and surviving mutants
- **Integration Test Reports**: Shows integration test results
- **E2E Test Reports**: Shows end-to-end test results
- **Performance Test Reports**: Shows performance metrics

### Coverage Reports

The CI pipeline uploads coverage reports to Codecov, which provides:
- Overall coverage percentage
- Coverage trends over time
- Coverage breakdown by file
- Coverage breakdown by function

### Mutation Testing Reports

Mutation testing helps verify the quality of your tests by making small changes (mutations) to your code and checking if your tests catch these changes.

- **Go Mutation Testing**: Uses go-mutesting to generate a report showing mutation score and surviving mutants
- **TypeScript Mutation Testing**: Uses Stryker to generate a report showing mutation score and surviving mutants

## Common Issues and Fixes

### Lint Failures

- **Go Lint Failures**:
  - Run `golangci-lint run ./...` locally to see issues
  - Common issues include formatting, unused variables, and missing error checks
  - Fix: Follow the suggestions provided by golangci-lint

- **TypeScript Lint Failures**:
  - Run `npm run lint` locally to see issues
  - Common issues include formatting, unused variables, and type errors
  - Fix: Follow the suggestions provided by ESLint

### Unit Test Failures

- **Go Unit Test Failures**:
  - Run `go test -v ./test/unit/...` locally to debug
  - Check the test output for specific failures
  - Fix: Update the code or tests to fix the failing tests

- **TypeScript Unit Test Failures**:
  - Run `npm test` locally to debug
  - Check the test output for specific failures
  - Fix: Update the code or tests to fix the failing tests

### Mutation Test Failures

- **Go Mutation Test Failures**:
  - Check the mutation test report for surviving mutants
  - Run `go-mutesting ./path/to/package` locally to debug
  - Fix: Improve tests to catch the surviving mutants

- **TypeScript Mutation Test Failures**:
  - Check the Stryker report for surviving mutants
  - Run `npx stryker run` locally to debug
  - Fix: Improve tests to catch the surviving mutants

### Integration Test Failures

- **Go Integration Test Failures**:
  - Run `go test -v ./test/integration/...` locally to debug
  - Check if the mock MAAS server is correctly configured
  - Fix: Update the code or tests to fix the failing tests

- **TypeScript Integration Test Failures**:
  - Run `npm run test:integration` locally to debug
  - Check if the mock MAAS server is correctly configured
  - Fix: Update the code or tests to fix the failing tests

### E2E Test Failures

- **E2E Test Failures**:
  - Set up a local MAAS instance and run E2E tests locally to debug
  - Check if the MAAS instance is correctly configured
  - Check if the server is correctly configured
  - Fix: Update the code or tests to fix the failing tests

### Performance Test Failures

- **Performance Test Failures**:
  - Check if recent changes might have affected performance
  - Run performance tests locally to debug
  - Fix: Optimize the code to improve performance

## Mutation Testing

Mutation testing helps verify the quality of your tests by making small changes (mutations) to your code and checking if your tests catch these changes.

### Go Mutation Testing

We use [go-mutesting](https://github.com/zimmski/go-mutesting) for Go mutation testing.

To run mutation tests locally:

```bash
go install github.com/zimmski/go-mutesting/cmd/go-mutesting@latest
go-mutesting ./internal/models ./internal/service/resources
```

The mutation score should be at least 80% for critical components.

### TypeScript Mutation Testing

We use [Stryker](https://stryker-mutator.io/) for TypeScript mutation testing.

To run mutation tests locally:

```bash
npm install --no-save @stryker-mutator/core @stryker-mutator/jest-runner
npx stryker run
```

The mutation score should be at least 80% for critical components.

## CI Notifications

The CI pipeline sends notifications in the following cases:

- **Pipeline Failure**: Sends a Slack notification with details about the failure
- **Test Failures**: Sends a Slack notification with details about failing tests

To receive notifications, make sure the `SLACK_WEBHOOK_URL` secret is configured in the GitHub repository.

## Testing the CI Pipeline

To test the CI pipeline:

1. Create a branch with passing tests and open a PR
2. Create a branch with failing tests and open a PR
3. Check that the CI pipeline correctly identifies issues

## CI Pipeline Configuration

The CI pipeline is configured in the following files:

- `.github/workflows/ci.yml`: GitHub Actions workflow configuration
- `.go-mutesting.yaml`: Go mutation testing configuration
- `stryker.conf.json`: TypeScript mutation testing configuration

## Troubleshooting

### Pipeline Takes Too Long to Run

- Check if the mutation tests are running on too many files
- Consider running mutation tests only on critical components
- Consider running E2E tests only on PRs to `main`

### Pipeline Fails Intermittently

- Check if the tests have race conditions
- Check if the tests depend on external services
- Consider adding retries for flaky tests

### Pipeline Fails with Out of Memory Errors

- Check if the tests are using too much memory
- Consider running memory-intensive tests in separate jobs
- Consider increasing the memory limit for the GitHub Actions runners