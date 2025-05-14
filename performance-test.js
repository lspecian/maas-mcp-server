import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const machineListingTrend = new Trend('machine_listing_duration');
const networkListingTrend = new Trend('network_listing_duration');
const tagListingTrend = new Trend('tag_listing_duration');

// Test configuration
export const options = {
  // Test scenarios
  scenarios: {
    // Smoke test - low load to verify functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      gracefulStop: '5s',
      exec: 'smoke',
    },
    // Load test - moderate load to test normal operation
    load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '5s',
      exec: 'load',
    },
    // Stress test - high load to test system limits
    stress: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      gracefulStop: '5s',
      exec: 'stress',
    },
  },
  // Thresholds for test success/failure
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
    'http_req_failed': ['rate<0.01'],   // Less than 1% of requests should fail
    'error_rate': ['rate<0.01'],        // Less than 1% of checks should fail
    'machine_listing_duration': ['p(95)<1000'], // 95% of machine listing requests should be below 1000ms
    'network_listing_duration': ['p(95)<1000'],  // 95% of network listing requests should be below 1000ms
    'tag_listing_duration': ['p(95)<500'],       // 95% of tag listing requests should be below 500ms
  },
};

// Base URL for the API
const baseUrl = 'http://localhost:8080';

// Headers for API requests
const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Smoke test - basic functionality verification
export function smoke() {
  // Health check
  const healthRes = http.get(`${baseUrl}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response has ok status': (r) => r.json().status === 'ok',
  }) || errorRate.add(1);
  
  // Basic machine listing
  const machineStart = new Date();
  const machineRes = http.get(`${baseUrl}/api/machines`, { headers });
  machineListingTrend.add(new Date() - machineStart);
  check(machineRes, {
    'machine listing status is 200': (r) => r.status === 200,
    'machine listing returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1);
  
  sleep(1);
}

// Load test - normal operation simulation
export function load() {
  // Machine listing
  const machineStart = new Date();
  const machineRes = http.get(`${baseUrl}/api/machines`, { headers });
  machineListingTrend.add(new Date() - machineStart);
  check(machineRes, {
    'machine listing status is 200': (r) => r.status === 200,
    'machine listing returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1);
  
  // Network listing
  const networkStart = new Date();
  const networkRes = http.get(`${baseUrl}/api/networks`, { headers });
  networkListingTrend.add(new Date() - networkStart);
  check(networkRes, {
    'network listing status is 200': (r) => r.status === 200,
    'network listing returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1);
  
  // Tag listing
  const tagStart = new Date();
  const tagRes = http.get(`${baseUrl}/api/tags`, { headers });
  tagListingTrend.add(new Date() - tagStart);
  check(tagRes, {
    'tag listing status is 200': (r) => r.status === 200,
    'tag listing returns array': (r) => Array.isArray(r.json()),
  }) || errorRate.add(1);
  
  sleep(1);
}

// Stress test - high load simulation
export function stress() {
  // Machine operations
  const machineStart = new Date();
  const machineRes = http.get(`${baseUrl}/api/machines`, { headers });
  machineListingTrend.add(new Date() - machineStart);
  check(machineRes, {
    'machine listing status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Get a specific machine (assuming ID 1 exists)
  const machineDetailRes = http.get(`${baseUrl}/api/machines/1`, { headers });
  check(machineDetailRes, {
    'machine detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);
  
  // Network operations
  const networkStart = new Date();
  const networkRes = http.get(`${baseUrl}/api/networks`, { headers });
  networkListingTrend.add(new Date() - networkStart);
  check(networkRes, {
    'network listing status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Tag operations
  const tagStart = new Date();
  const tagRes = http.get(`${baseUrl}/api/tags`, { headers });
  tagListingTrend.add(new Date() - tagStart);
  check(tagRes, {
    'tag listing status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.5);
}

// Default function if no scenario is specified
export default function() {
  smoke();
}