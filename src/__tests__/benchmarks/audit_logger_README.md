# Audit Logger Performance Benchmarks

This directory contains benchmark tests for the MAAS MCP server audit logging system. These tests measure and document the performance impact of audit logging under various load scenarios and with different configurations.

## Overview

The benchmark tests measure:

1. **Response Time Impact**: Compare response times with and without audit logging enabled
2. **Throughput Impact**: Compare the number of requests that can be handled per second with and without audit logging
3. **Resource State Impact**: Measure the performance impact of including resource state in audit logs
4. **Sensitive Field Masking Impact**: Measure the performance impact of masking sensitive fields in audit logs
5. **Concurrency Impact**: Measure the performance impact of audit logging under different concurrency levels
6. **Request Pattern Impact**: Measure the performance impact of audit logging with different request patterns

## Running the Benchmarks

To run the benchmark tests:

```bash
# Run all benchmark tests
npm test -- src/__tests__/benchmarks/audit_logger_performance.benchmark.test.ts

# Run a specific benchmark test
npm test -- src/__tests__/benchmarks/audit_logger_performance.benchmark.test.ts -t "Basic Performance Tests"
```

## Test Configuration

The benchmark tests are configurable through constants at the top of the test file:

- `CONCURRENCY_LEVELS`: Number of concurrent requests to test
- `REQUEST_COUNTS`: Number of requests to make in each test
- `NETWORK_DELAYS`: Simulated network delays in milliseconds

You can adjust these values to test different scenarios.

## Test Metrics

The benchmark tests measure and report the following metrics:

- **Average Response Time**: Average time to complete a request
- **Median Response Time**: Median time to complete a request
- **95th Percentile Response Time**: 95th percentile of response times
- **Maximum Response Time**: Maximum time to complete a request
- **Requests Per Second**: Number of requests that can be handled per second
- **Success Rate**: Percentage of requests that completed successfully

## Test Scenarios

### Basic Performance Tests

These tests measure the basic performance impact of enabling audit logging. They compare:

- No audit logging
- Basic audit logging (minimal configuration)

### Resource State Impact Tests

These tests measure the performance impact of including resource state in audit logs:

- Audit logging without resource state
- Audit logging with resource state

### Sensitive Field Masking Tests

These tests measure the performance impact of masking sensitive fields in audit logs:

- Audit logging with resource state, without masking
- Audit logging with resource state, with masking

### Concurrency Tests

These tests measure the performance impact of audit logging under different concurrency levels:

- Single concurrent request
- Multiple concurrent requests

### Request Pattern Tests

These tests measure the performance impact of audit logging with different request patterns:

- **Same**: All requests for the same resource
- **Random**: Random requests across different resources
- **Mixed**: 80% to popular resources, 20% to less popular resources

### Full Configuration Tests

These tests measure the performance impact of different audit log configurations:

- **Minimal**: Basic audit logging without resource state or masking
- **With State**: Audit logging with resource state, without masking
- **With Masking**: Audit logging with resource state and masking

## Results

The benchmark tests output results in two tables:

1. **Benchmark Results**: Detailed metrics for each test
2. **Performance Impact Summary**: Comparison of audit logging enabled vs. disabled performance

Example output:

```
===== AUDIT LOGGER PERFORMANCE BENCHMARK RESULTS =====

┌─────────┬────────────────────────────────────┬───────────┬─────────────┬────────────┬────────────┬───────────┬───────┬───────────┬─────────┬──────────────┬────────────┬────────────┬─────────┬──────────┬───────────┐
│ (index) │               Test                 │ Audit Log │ Include State│ Mask Fields│ Log to File│ Concurrent│ Total │ Delay (ms)│ Pattern │ Avg Time (ms)│ Median (ms)│ P95 (ms)   │ Max (ms)│  Req/s   │ Success % │
├─────────┼────────────────────────────────────┼───────────┼─────────────┼────────────┼────────────┼───────────┼───────┼───────────┼─────────┼──────────────┼────────────┼────────────┼─────────┼──────────┼───────────┤
│    0    │'Basic (50ms delay, audit log d...' │'Disabled' │    'No'     │   'Yes'    │    'No'    │     1     │  20   │    50     │  'same' │   '55.20'    │   '54.00'  │   '60.00'  │ '60.00' │  '18.12' │  '100.00' │
│    1    │'Basic (50ms delay, audit log e...' │'Enabled'  │    'No'     │   'Yes'    │    'No'    │     1     │  20   │    50     │  'same' │   '57.15'    │   '56.00'  │   '62.00'  │ '63.00' │  '17.50' │  '100.00' │
└─────────┴────────────────────────────────────┴───────────┴─────────────┴────────────┴────────────┴───────────┴───────┴───────────┴─────────┴──────────────┴────────────┴────────────┴─────────┴──────────┴───────────┘

===== AUDIT LOGGER PERFORMANCE IMPACT SUMMARY =====

┌─────────┬────────────────────────────────────┬─────────────┬────────────┬────────────┬───────────┬─────────┬─────────────────────┬────────────────────┐
│ (index) │               Test                 │ Include State│ Mask Fields│ Log to File│ Concurrent│ Pattern │ Response Time Impact│ Throughput Impact  │
├─────────┼────────────────────────────────────┼─────────────┼────────────┼────────────┼───────────┼─────────┼─────────────────────┼────────────────────┤
│    0    │'Basic (50ms delay, audit log e...' │    'No'     │   'Yes'    │    'No'    │     1     │  'same' │       '3.53%'       │      '3.42%'       │
└─────────┴────────────────────────────────────┴─────────────┴────────────┴────────────┴───────────┴─────────┴─────────────────────┴────────────────────┘
```

## Interpreting Results

- **Response Time Impact**: Percentage increase in response time when using audit logging. A value of 5% means audit logging adds 5% to the response time.
- **Throughput Impact**: Percentage decrease in requests per second when using audit logging. A value of 5% means the system can handle 5% fewer requests per second with audit logging enabled.

Lower values for both metrics indicate less performance impact from audit logging.

### Example Interpretation

For a result showing:
- Response Time Impact: 3.53%
- Throughput Impact: 3.42%

This indicates that:
1. Audit logging adds about 3.5% to the response time
2. Audit logging reduces throughput by about 3.4%

### Comparing Configurations

When comparing different audit log configurations:

- **Basic vs. With Resource State**: Shows the impact of including resource state in logs
- **With Resource State vs. With Masking**: Shows the impact of masking sensitive fields
- **Different Concurrency Levels**: Shows how the impact scales with load

## Troubleshooting

### Common Issues

1. **High Response Time Impact**:
   - Check if resource state inclusion is necessary
   - Consider reducing the amount of data logged
   - Optimize sensitive field masking

2. **High Throughput Impact**:
   - Consider using asynchronous logging
   - Reduce log verbosity
   - Optimize log serialization

3. **Inconsistent Results**:
   - Run tests multiple times to get statistically significant results

### Debugging

To enable more detailed logging during benchmark runs, set the `DEBUG_MODE` constant to `true` at the top of the test file.

To export benchmark results to a JSON file for further analysis, set the environment variable `EXPORT_RESULTS=true` when running the tests:

```bash
EXPORT_RESULTS=true npm test -- src/__tests__/benchmarks/audit_logger_performance.benchmark.test.ts
```

The results will be saved in the `src/__tests__/benchmarks/results/` directory.