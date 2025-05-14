/**
 * @file MaasMockFactory.ts
 *
 * Provides a factory for creating and configuring mock MaasApiClient instances
 * with consistent patterns and flexible configuration options for testing.
 */

import { MaasApiClient } from '../../maas/MaasApiClient.js';
import { 
  createMockMaasApiClient, 
  MockMaasApiClientOptions,
  mockMachines, // Default success response
  mockClientConfigs as baseMockConfigs // For referencing existing predefined configs
} from './mockMaasApiClient.js'; // Assuming this is the base mock client
import { MaasApiError } from '../../types/index.js';

export class MaasMockFactory {
  private options: MockMaasApiClientOptions;

  constructor(defaultOptions: MockMaasApiClientOptions = {}) {
    this.options = { ...defaultOptions };
  }

  /**
   * Sets the response to return for successful requests.
   * @param response The success response data.
   * @returns The factory instance for chaining.
   */
  public withSuccessResponse(response: any): this {
    this.options.successResponse = response;
    return this;
  }

  /**
   * Sets the error to throw for failed requests.
   * @param errorResponse The error object or message.
   * @param statusCode Optional HTTP status code for the error.
   * @returns The factory instance for chaining.
   */
  public withErrorResponse(errorResponse: Error | string, statusCode?: number): this {
    this.options.errorResponse = errorResponse;
    if (statusCode !== undefined) {
      this.options.statusCode = statusCode;
    }
    return this;
  }

  /**
   * Configures basic network delay and jitter.
   * @param delayMs Milliseconds to delay.
   * @param jitterMs Maximum additional random delay (jitter).
   * @returns The factory instance for chaining.
   */
  public withNetworkDelay(delayMs: number, jitterMs = 0): this {
    this.options.simulateNetworkDelay = delayMs;
    this.options.networkJitterMs = jitterMs;
    return this;
  }

  /**
   * Configures network timeout simulation.
   * @param timeoutMs Timeout duration in milliseconds.
   * @returns The factory instance for chaining.
   */
  public withTimeout(timeoutMs = 30000): this {
    this.options.simulateTimeout = true;
    this.options.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Configures response pagination.
   * @param itemsPerPage Number of items per page.
   * @returns The factory instance for chaining.
   */
  public withPagination(itemsPerPage = 10): this {
    this.options.simulatePagination = true;
    this.options.itemsPerPage = itemsPerPage;
    return this;
  }

  /**
   * Configures rate limiting simulation.
   * @param threshold Maximum requests before rate limiting.
   * @param statusCode HTTP status code for rate limit response.
   * @returns The factory instance for chaining.
   */
  public withRateLimiting(threshold = 10, statusCode = 429): this {
    this.options.simulateRateLimiting = true;
    this.options.rateLimitThreshold = threshold;
    this.options.rateLimitStatusCode = statusCode;
    return this;
  }

  /**
   * Configures intermittent failures.
   * @param probability Probability of failure (0-1).
   * @param pattern Failure pattern ('random', 'every-n', 'specific-endpoints').
   * @param interval Interval for 'every-n' pattern.
   * @param endpoints Endpoints for 'specific-endpoints' pattern.
   * @returns The factory instance for chaining.
   */
  public withIntermittentFailures(
    probability = 0.2,
    pattern: 'random' | 'every-n' | 'specific-endpoints' = 'random',
    interval = 3,
    endpoints: string[] = []
  ): this {
    this.options.simulateIntermittentFailures = true;
    this.options.intermittentFailureProbability = probability;
    this.options.intermittentFailurePattern = pattern;
    this.options.intermittentFailureInterval = interval;
    this.options.intermittentFailureEndpoints = endpoints;
    return this;
  }

  /**
   * Configures specific HTTP error codes for endpoints.
   * @param errors A record mapping endpoint patterns to HTTP status codes.
   * @returns The factory instance for chaining.
   */
  public withSpecificErrors(errors: Record<string, number>): this {
    this.options.specificErrors = { ...(this.options.specificErrors || {}), ...errors };
    return this;
  }

  /**
   * Configures variable latency based on response size.
   * @param latencyPerKb Milliseconds of latency per KB of data.
   * @returns The factory instance for chaining.
   */
  public withVariableLatency(latencyPerKb = 10): this {
    this.options.simulateVariableLatency = true;
    this.options.latencyPerKb = latencyPerKb;
    return this;
  }

  /**
   * Configures bandwidth limitation simulation.
   * @param bandwidthKBps Simulated bandwidth in KB per second.
   * @returns The factory instance for chaining.
   */
  public withBandwidthLimits(bandwidthKBps = 100): this {
    this.options.simulateBandwidthLimits = true;
    this.options.bandwidthKBps = bandwidthKBps;
    return this;
  }

  /**
   * Configures connection drop simulation.
   * @param probability Probability (0-1) of a connection drop.
   * @returns The factory instance for chaining.
   */
  public withConnectionDrops(probability = 0.05): this {
    this.options.simulateConnectionDrops = true;
    this.options.connectionDropProbability = probability;
    return this;
  }

  /**
   * Configures progressive degradation simulation.
   * @param degradationFactor Factor to increase delay with each request.
   * @param maxMultiplier Maximum degradation multiplier.
   * @returns The factory instance for chaining.
   */
  public withProgressiveDegradation(degradationFactor = 1.1, maxMultiplier = 10): this {
    this.options.simulateProgressiveDegradation = true;
    this.options.degradationFactor = degradationFactor;
    this.options.maxDegradationMultiplier = maxMultiplier;
    return this;
  }

  /**
   * Configures geographic latency simulation.
   * @param location Simulated geographic location.
   * @param latencyMap Custom latency map.
   * @returns The factory instance for chaining.
   */
  public withGeographicLatency(
    location: 'local' | 'regional' | 'continental' | 'global' = 'local',
    latencyMap?: { local?: number; regional?: number; continental?: number; global?: number }
  ): this {
    this.options.simulateGeographicLatency = true;
    this.options.geographicLocation = location;
    if (latencyMap) {
      this.options.geographicLatencyMap = latencyMap;
    }
    return this;
  }
  
  /**
   * Allows setting any specific option directly.
   * @param options Partial options to merge.
   * @returns The factory instance for chaining.
   */
  public withOptions(options: Partial<MockMaasApiClientOptions>): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Builds and returns the configured mock MaasApiClient.
   * @returns A mocked MaasApiClient instance.
   */
  public create(): jest.Mocked<MaasApiClient> {
    // Ensure a default success response if none is set and no error is set
    if (this.options.successResponse === undefined && this.options.errorResponse === undefined) {
      this.options.successResponse = mockMachines;
    }
    return createMockMaasApiClient(this.options);
  }

  // --- Predefined Configurations ---

  /**
   * Creates a client with default successful responses.
   */
  public static defaultClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().create();
  }

  /**
   * Creates a client that returns empty results.
   */
  public static emptyClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({ successResponse: [] }).create();
  }

  /**
   * Creates a client that simulates network timeouts.
   */
  public static timeoutClient(timeoutMs = 30000): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withTimeout(timeoutMs).create();
  }

  /**
   * Creates a client that simulates slow network responses.
   * (Corresponds to baseMockConfigs.slow)
   */
  public static slowClient(delay = 500): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withNetworkDelay(delay).create();
  }
  
  /**
   * Creates a client that simulates high latency network conditions.
   * (Corresponds to integrationMockConfigs.highLatency)
   */
  public static highLatencyClient(delay = 2000, jitter = 1000): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withNetworkDelay(delay, jitter).create();
  }

  /**
   * Creates a client that returns 404 Not Found errors.
   */
  public static notFoundClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({
      errorResponse: new MaasApiError('Resource not found', 404, 'not_found', {
        error: 'not_found',
        detail: 'The requested resource could not be found'
      })
    }).create();
  }

  /**
   * Creates a client that returns 500 Internal Server errors.
   */
  public static serverErrorClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({
      errorResponse: new MaasApiError('Internal server error', 500, 'server_error', {
        error: 'server_error',
        detail: 'An unexpected error occurred on the server'
      })
    }).create();
  }
  
  /**
   * Creates a client that returns 401 Unauthorized errors.
   */
  public static unauthorizedClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({
      errorResponse: new MaasApiError('Unauthorized access', 401, 'unauthorized', {
        error: 'unauthorized',
        detail: 'Authentication credentials were not provided or are invalid'
      })
    }).create();
  }

  /**
   * Creates a client that returns 403 Forbidden errors.
   */
  public static forbiddenClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({
      errorResponse: new MaasApiError('Forbidden', 403, 'forbidden', {
        error: 'forbidden',
        detail: 'You do not have permission to perform this action'
      })
    }).create();
  }
  
  /**
   * Creates a client that returns 422 Validation errors.
   */
  public static validationErrorClient(): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory({
      errorResponse: new MaasApiError('Validation error', 422, 'validation_error', {
        error: 'validation_error',
        detail: 'The request data failed validation',
        fields: {
          name: ['This field is required'],
          value: ['Must be a positive number']
        }
      })
    }).create();
  }

  /**
   * Creates a client that simulates paginated responses.
   */
  public static paginatedClient(itemsPerPage = 10): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withPagination(itemsPerPage).create();
  }
  
  /**
   * Creates a client that simulates flaky network with random errors.
   * (Corresponds to integrationMockConfigs.flaky)
   */
  public static flakyClient(errorProbability = 0.3, networkDelayMs = 100): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory()
      .withNetworkDelay(networkDelayMs)
      .withIntermittentFailures(errorProbability, 'random') // Using intermittent as a proxy for general random errors
      .create();
  }

  /**
   * Creates a client that simulates rate limiting.
   * (Corresponds to integrationMockConfigs.rateLimited)
   */
  public static rateLimitedClient(threshold = 3, networkDelayMs = 100): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory()
      .withNetworkDelay(networkDelayMs)
      .withRateLimiting(threshold)
      .create();
  }
  
  /**
   * Creates a client that simulates realistic network conditions.
   * (Corresponds to baseMockConfigs.realisticNetwork)
   */
  public static realisticNetworkClient(): jest.Mocked<MaasApiClient> {
    // Replicating options from baseMockConfigs.realisticNetwork
    return new MaasMockFactory({
      simulateNetworkDelay: 100,
      networkJitterMs: 50,
      simulateVariableLatency: true,
      latencyPerKb: 10,
      simulateConnectionDrops: true,
      connectionDropProbability: 0.02,
      simulateIntermittentFailures: true,
      intermittentFailureProbability: 0.05
    }).create();
  }
  
  /**
   * Creates a client that simulates variable latency.
   */
  public static variableLatencyClient(latencyPerKb = 20, baseDelay = 50): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory()
      .withNetworkDelay(baseDelay)
      .withVariableLatency(latencyPerKb)
      .create();
  }

  /**
   * Creates a client that simulates limited bandwidth.
   */
  public static limitedBandwidthClient(kbps = 50): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withBandwidthLimits(kbps).create();
  }

  /**
   * Creates a client that simulates connection drops.
   */
  public static connectionDropsClient(probability = 0.2): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withConnectionDrops(probability).create();
  }

  /**
   * Creates a client that simulates progressive degradation.
   */
  public static progressiveDegradationClient(baseDelay = 50, factor = 1.2): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory()
      .withNetworkDelay(baseDelay)
      .withProgressiveDegradation(factor)
      .create();
  }

  /**
   * Creates a client that simulates geographic latency.
   */
  public static geographicLatencyClient(location: 'local' | 'regional' | 'continental' | 'global' = 'global'): jest.Mocked<MaasApiClient> {
    return new MaasMockFactory().withGeographicLatency(location).create();
  }
}

// Example usage (for testing the factory itself, or for documentation)
/*
const factory = new MaasMockFactory();

const defaultClient = factory.create();
const slowClient = factory.withNetworkDelay(1000).create();
const errorClient = factory.withErrorResponse(new MaasApiError('Test Error', 500)).create();
const paginatedClient = factory.withPagination(5).create();

const staticSlowClient = MaasMockFactory.slowClient(2000);
const staticRealisticClient = MaasMockFactory.realisticNetworkClient();
*/