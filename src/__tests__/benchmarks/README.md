# Cache Performance Benchmarks

This directory contains benchmark tests for the MAAS MCP server caching system. These tests measure and document the performance improvements provided by the caching system under various load scenarios.

## Overview

The benchmark tests measure:

1. **Response Time**: Compare response times for cached vs. non-cached requests
2. **Throughput**: Compare the number of requests that can be handled per second with and without caching
3. **Load Patterns**: Test different request patterns (same resource, random resources, mixed)
4. **Cache Strategies**: Compare the performance of different caching strategies (TimeBased and LRU)
5. **TTL Values**: Test the impact of different Time-To-Live (TTL) values

## Running the Benchmarks

To run the benchmark tests:

```bash
# Run all benchmark tests
npm test -- src/__tests__/benchmarks/cache_performance.benchmark.test.ts

# Run a specific benchmark test
npm test -- src/__tests__/benchmarks/cache_performance.benchmark.test.ts -t "Response Time Tests"
```

## Test Configuration

The benchmark tests are configurable through constants at the top of the test file:

- `CONCURRENCY_LEVELS`: Number of concurrent requests to test
- `REQUEST_COUNTS`: Number of requests to make in each test
- `NETWORK_DELAYS`: Simulated network delays in milliseconds
- `CACHE_TTL_VALUES`: Cache TTL values to test in seconds

You can adjust these values to test different scenarios.

## Test Metrics

The benchmark tests measure and report the following metrics:

- **Average Response Time**: Average time to complete a request
- **Median Response Time**: Median time to complete a request
- **95th Percentile Response Time**: 95th percentile of response times
- **Maximum Response Time**: Maximum time to complete a request
- **Requests Per Second**: Number of requests that can be handled per second
- **Success Rate**: Percentage of requests that completed successfully
- **Cache Hit Ratio**: Percentage of requests that were served from cache

## Test Scenarios

### Response Time Tests

These tests measure the improvement in response time when using caching. They compare:

- No caching
- Time-based caching
- LRU caching

### Throughput Tests

These tests measure the improvement in throughput (requests per second) when using caching. They test different concurrency levels to simulate varying loads.

### Load Pattern Tests

These tests measure performance with different request patterns:

- **Same**: All requests for the same resource
- **Random**: Random requests across different resources
- **Mixed**: 80% to popular resources, 20% to less popular resources

### Cache Strategy Comparison

These tests compare the performance of different caching strategies:

- **Time-based**: Simple expiration-based caching that invalidates entries after a specified TTL (Time-To-Live) period. This strategy is effective when data has a predictable freshness period and is ideal for resources that change at regular intervals.
  - **Pros**: Simple to implement and understand, predictable memory usage
  - **Cons**: May keep rarely used items in cache while evicting frequently used ones

- **LRU (Least Recently Used)**: Prioritizes recently accessed resources and evicts the least recently used items when the cache reaches its capacity limit. This strategy is effective for workloads with temporal locality where recently accessed items are likely to be accessed again.
  - **Pros**: Adapts to usage patterns, efficient for frequently accessed resources
  - **Cons**: May evict items that are expensive to regenerate but accessed infrequently

### TTL Tests

These tests measure the impact of different TTL values on cache performance.

## Results

The benchmark tests output results in two tables:

1. **Benchmark Results**: Detailed metrics for each test
2. **Performance Improvement Summary**: Comparison of cached vs. non-cached performance

Example output:

```
===== CACHE PERFORMANCE BENCHMARK RESULTS =====

┌─────────┬────────────────────────────────────┬─────────┬──────────┬─────┬───────────┬───────┬───────────┬─────────┬──────────────┬────────────┬────────────┬─────────┬──────────┬─────────────┐
│ (index) │               Test                 │  Cache  │ Strategy │ TTL │ Concurrent│ Total │ Delay (ms)│ Pattern │ Avg Time (ms)│ Median (ms)│ P95 (ms)   │ Max (ms)│  Req/s   │ Cache Hit % │
├─────────┼────────────────────────────────────┼─────────┼──────────┼─────┼───────────┼───────┼───────────┼─────────┼──────────────┼────────────┼────────────┼─────────┼──────────┼─────────────┤
│    0    │'Response Time (50ms delay, no...'  │'Disabled'│'time-...'│ 300 │     1     │  20   │    50     │  'same' │   '55.20'    │   '54.00'  │   '60.00'  │ '60.00' │  '18.12' │    'N/A'    │
│    1    │'Response Time (50ms delay, tim...' │'Enabled' │'time-...'│ 300 │     1     │  20   │    50     │  'same' │   '5.20'     │   '5.00'   │   '6.00'   │ '6.00'  │ '192.31' │   '95.00'   │
│    2    │'Response Time (50ms delay, LRU...' │'Enabled' │  'lru'   │ 300 │     1     │  20   │    50     │  'same' │   '5.15'     │   '5.00'   │   '6.00'   │ '6.00'  │ '194.17' │   '95.00'   │
└─────────┴────────────────────────────────────┴─────────┴──────────┴─────┴───────────┴───────┴───────────┴─────────┴──────────────┴────────────┴────────────┴─────────┴──────────┴─────────────┘

===== PERFORMANCE IMPROVEMENT SUMMARY =====

┌─────────┬────────────────────────────────────┬──────────┬─────┬───────────┬─────────┬─────────────────────────┬────────────────────────┬───────────────┐
│ (index) │               Test                 │ Strategy │ TTL │ Concurrent│ Pattern │ Response Time Improvement│ Throughput Improvement │ Cache Hit Ratio│
├─────────┼────────────────────────────────────┼──────────┼─────┼───────────┼─────────┼─────────────────────────┼────────────────────────┼───────────────┤
│    0    │'Response Time (50ms delay, tim...' │'time-...'│ 300 │     1     │  'same' │        '90.58%'         │       '961.31%'        │    '95.00%'    │
│    1    │'Response Time (50ms delay, LRU...' │  'lru'   │ 300 │     1     │  'same' │        '90.67%'         │       '971.69%'        │    '95.00%'    │
└─────────┴────────────────────────────────────┴──────────┴─────┴───────────┴─────────┴─────────────────────────┴────────────────────────┴───────────────┘
```

## Interpreting Results

- **Response Time Improvement**: Percentage reduction in response time when using caching. A value of 90% means cached responses are 90% faster than non-cached responses.
- **Throughput Improvement**: Percentage increase in requests per second when using caching. A value of 500% means the system can handle 5x more requests per second with caching enabled.
- **Cache Hit Ratio**: Percentage of requests that were served from cache. A value of 95% means 95% of requests were served from cache without hitting the backend.

Higher values for all these metrics indicate better cache performance.

### Example Interpretation

For a result showing:
- Response Time Improvement: 90%
- Throughput Improvement: 900%
- Cache Hit Ratio: 95%

This indicates that:
1. Cached responses are 10x faster than non-cached responses
2. The system can handle 10x more requests per second with caching
3. 95% of requests are being served from cache

### Comparing Strategies

When comparing Time-based vs. LRU strategies:

- **For predictable, uniform access patterns**: Both strategies typically perform similarly
- **For skewed access patterns** (some resources accessed more frequently): LRU usually outperforms Time-based
- **For changing access patterns**: LRU adapts better as it automatically prioritizes frequently accessed resources

## Troubleshooting

### Common Issues

1. **Low Cache Hit Ratio**:
   - Check if TTL values are too low
   - Verify that request patterns match expected cache usage
   - Ensure cache keys are properly generated

2. **High Response Times Despite Caching**:
   - Check for cache implementation overhead
   - Verify that cache storage is efficient
   - Look for serialization/deserialization bottlenecks

3. **Inconsistent Results**:
   - Run tests multiple times to get statistically significant results
   - Ensure test environment is isolated from other processes
   - Check for external factors affecting performance

### Debugging

To enable more detailed logging during benchmark runs, set the `DEBUG_MODE` constant to `true` at the top of the test file.

To export benchmark results to a JSON file for further analysis, set the environment variable `EXPORT_RESULTS=true` when running the tests:

```bash
EXPORT_RESULTS=true npm test -- src/__tests__/benchmarks/cache_performance.benchmark.test.ts
```

The results will be saved in the `src/__tests__/benchmarks/results/` directory.