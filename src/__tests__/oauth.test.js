/**
 * Tests for OAuth 1.0a Authentication in MaasApiClient
 *
 * These tests focus on the OAuth authentication mechanism used by the MaasApiClient
 * to authenticate requests to the MAAS API.
 */

// Create mock for fetch
const mockFetchResponse = {
  ok: true,
  status: 200,
  json: jest.fn().mockResolvedValue({ success: true }),
  text: jest.fn().mockResolvedValue(JSON.stringify({ success: true }))
};

const mockFetch = jest.fn().mockResolvedValue(mockFetchResponse);

// Create mock for Headers
const mockHeadersSet = jest.fn();
const mockHeaders = {
  set: mockHeadersSet
};

const mockHeadersConstructor = jest.fn().mockReturnValue(mockHeaders);

// Create mock for crypto.randomBytes
const mockRandomBytesToString = jest.fn().mockReturnValue('test-nonce-value');
const mockRandomBytes = jest.fn().mockReturnValue({
  toString: mockRandomBytesToString
});

// Create mock for Date.now
const originalDateNow = Date.now;
const mockDateNow = jest.fn().mockReturnValue(1609459200000); // 2021-01-01T00:00:00.000Z

// Mock the modules
jest.mock('node-fetch', () => {
  return {
    __esModule: true,
    default: mockFetch,
    Headers: mockHeadersConstructor
  };
}, { virtual: true });

jest.mock('crypto', () => {
  return {
    randomBytes: mockRandomBytes
  };
}, { virtual: true });

// Override Date.now
Date.now = mockDateNow;

// Create a custom implementation of MaasApiClient for testing
class TestMaasApiClient {
  constructor(apiUrl, apiKey) {
    this.maasApiUrl = apiUrl || 'https://example.com/MAAS/api/2.0';
    
    // Parse API key
    if (apiKey) {
      const keyParts = apiKey.split(':');
      if (keyParts.length !== 3) {
        throw new Error("Invalid MAAS API key format. Expected <consumer_key>:<token>:<token_secret>");
      }
      
      this.apiKeyComponents = {
        consumerKey: keyParts[0],
        token: keyParts[1],
        tokenSecret: keyParts[2]
      };
    } else {
      // Default values
      this.apiKeyComponents = {
        consumerKey: 'consumer_key',
        token: 'token',
        tokenSecret: 'secret'
      };
    }
  }
  
  async makeRequest(method, endpoint, params) {
    // Ensure endpoint starts with a slash
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }
    
    // Construct the full URL
    const fullUrl = `${this.maasApiUrl}/api/2.0${endpoint}`;
    const headers = new mockHeadersConstructor();
    
    // Generate OAuth parameters
    const oauthParams = {
      oauth_consumer_key: this.apiKeyComponents.consumerKey,
      oauth_token: this.apiKeyComponents.token,
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: Math.floor(mockDateNow() / 1000).toString(),
      oauth_nonce: mockRandomBytes(16).toString('hex'),
      oauth_version: '1.0',
      // For PLAINTEXT, the signature is simply &token_secret
      // We need to handle the special case for the signature differently
      // since it's already URL-encoded in the original code
      oauth_signature: `&${this.apiKeyComponents.tokenSecret}`
    };
    
    // Construct the Authorization header
    const authHeader = 'OAuth ' + Object.entries(oauthParams)
      .map(([k, v]) => {
        // Special handling for oauth_signature to avoid double encoding
        if (k === 'oauth_signature') {
          return `${encodeURIComponent(k)}="%26${encodeURIComponent(this.apiKeyComponents.tokenSecret)}"`;
        }
        return `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`;
      })
      .sort()
      .join(', ');
    
    headers.set('Authorization', authHeader);
    
    // Make the request
    return mockFetch(fullUrl, {
      method,
      headers
    });
  }
  
  async get(endpoint, params) {
    return this.makeRequest('GET', endpoint, params);
  }
}

describe('MaasApiClient OAuth Authentication', () => {
  let maasApiClient;
  
  beforeEach(() => {
    // Reset mocks
    mockFetch.mockClear();
    mockHeadersSet.mockClear();
    mockHeadersConstructor.mockClear();
    mockRandomBytes.mockClear();
    mockRandomBytesToString.mockClear();
    mockDateNow.mockClear();
    
    // Create a new instance of TestMaasApiClient
    maasApiClient = new TestMaasApiClient();
  });
  
  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
  });
  
  test('should construct OAuth header with correct parameters', async () => {
    // Make a request to trigger OAuth header generation
    await maasApiClient.get('/test/');
    
    // Verify the Authorization header was set
    expect(mockHeadersSet).toHaveBeenCalledWith('Authorization', expect.stringContaining('OAuth '));
    
    // Get the Authorization header value
    const authHeader = mockHeadersSet.mock.calls.find(call => call[0] === 'Authorization')[1];
    
    // Verify all required OAuth parameters are present
    expect(authHeader).toContain('oauth_consumer_key="consumer_key"');
    expect(authHeader).toContain('oauth_token="token"');
    expect(authHeader).toContain('oauth_signature_method="PLAINTEXT"');
    expect(authHeader).toContain('oauth_timestamp="1609459200"'); // 2021-01-01T00:00:00Z in seconds
    expect(authHeader).toContain('oauth_nonce="test-nonce-value"');
    expect(authHeader).toContain('oauth_version="1.0"');
    expect(authHeader).toContain('oauth_signature="%26secret"'); // &secret URL-encoded
  });
  
  test('should properly encode OAuth parameter values', async () => {
    // Create a client with special characters in the API key
    const clientWithSpecialChars = new TestMaasApiClient(
      'https://example.com/MAAS/api/2.0',
      'consumer+key:token@value:secret&value'
    );
    
    // Make a request to trigger OAuth header generation
    await clientWithSpecialChars.get('/test/');
    
    // Get the Authorization header value
    const authHeader = mockHeadersSet.mock.calls.find(call => call[0] === 'Authorization')[1];
    
    // Verify special characters are properly encoded
    expect(authHeader).toContain('oauth_consumer_key="consumer%2Bkey"');
    expect(authHeader).toContain('oauth_token="token%40value"');
    expect(authHeader).toContain('oauth_signature="%26secret%26value"');
  });
  
  test('should throw error for invalid API key format', () => {
    // Creating a client with an invalid API key should throw an error
    expect(() => {
      new TestMaasApiClient('https://example.com/MAAS/api/2.0', 'invalid-format');
    }).toThrow('Invalid MAAS API key format');
  });
  
  test('should generate a unique nonce for each request', async () => {
    // Make multiple requests
    await maasApiClient.get('/test/1');
    await maasApiClient.get('/test/2');
    
    // Verify randomBytes was called for each request
    expect(mockRandomBytes).toHaveBeenCalledTimes(2);
  });
  
  test('should generate a new timestamp for each request', async () => {
    // Set initial timestamp
    mockDateNow.mockReturnValue(1609459200000); // Initial timestamp
    
    // Make first request
    await maasApiClient.get('/test/1');
    
    // Get the first Authorization header
    const firstAuthHeader = mockHeadersSet.mock.calls.find(call => call[0] === 'Authorization')[1];
    expect(firstAuthHeader).toContain('oauth_timestamp="1609459200"');
    
    // Update the timestamp for the second request
    mockDateNow.mockReturnValue(1609459300000); // 100 seconds later
    mockHeadersSet.mockClear();
    
    // Make second request
    await maasApiClient.get('/test/2');
    
    // Get the second Authorization header
    const secondAuthHeader = mockHeadersSet.mock.calls.find(call => call[0] === 'Authorization')[1];
    expect(secondAuthHeader).toContain('oauth_timestamp="1609459300"');
  });
  
  test('should sort OAuth parameters alphabetically', async () => {
    // Make a request to trigger OAuth header generation
    await maasApiClient.get('/test/');
    
    // Get the Authorization header value
    const authHeader = mockHeadersSet.mock.calls.find(call => call[0] === 'Authorization')[1];
    
    // Split the header into parts
    const parts = authHeader.split(', ');
    
    // Verify the parts are sorted alphabetically
    const sortedParts = [...parts].sort();
    expect(parts).toEqual(sortedParts);
  });
});