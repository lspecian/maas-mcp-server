import { OAuth } from 'oauth';
import logger from '../utils/logger.js'; // Assuming logger.js is in src/utils
import config from '../config.js';      // Assuming config.js is in src
import { randomBytes } from 'crypto';
import FormData from 'form-data'; // Import the form-data package
import {
  MaasApiError,
  type MaasApiRequestParams,
  type MaasApiRequestBody,
  type MaasApiResponse,
  type MaasApiOptionalResponse,
  // MaasApiClientConfig is not directly used by the client constructor here
  // as it reads from a global `config` object.
  // If the constructor were to take a config object, it would be imported.
} from '../types/maas.js';

// Ensure FormData is available. If not using a modern Node.js version,
// you might need a polyfill like 'formdata-node' and import it.
// For modern Node, global FormData should be fine.


/**
 * Client for interacting with the Canonical MAAS API
 *
 * This class provides methods for making authenticated requests to the MAAS API,
 * handling common tasks such as:
 * - OAuth authentication
 * - Request retries with exponential backoff
 * - Error handling and normalization
 * - Support for various HTTP methods (GET, POST, PUT, DELETE)
 * - Multipart form data uploads
 * - Abort signal support for cancellation
 */
export class MaasApiClient {
  private readonly maasApiUrl: string;
  private readonly consumerKey: string;
  private readonly oauthToken: string;
  private readonly oauthTokenSecret: string;
  // oauthClient might not be directly used if manually constructing headers,
  // but can be kept for reference or future use with the oauth library's methods.
  private readonly oauthClient: OAuth;

  constructor() {
    logger.debug('Initializing MaasApiClient...');
    this.maasApiUrl = config.maasApiUrl.endsWith('/')
      ? config.maasApiUrl.slice(0, -1)
      : config.maasApiUrl;
    logger.debug({ maasApiUrl: this.maasApiUrl }, 'MAAS API URL configured.');

    const keyParts = config.maasApiKey.split(':');
    if (keyParts.length !== 3) {
      logger.error({ maasApiKeyPreview: config.maasApiKey.substring(0, 10) + '...' }, "Invalid MAAS API key format during MaasApiClient construction.");
      throw new Error("Invalid MAAS API key format. Expected <consumer_key>:<token>:<token_secret>");
    }
    [this.consumerKey, this.oauthToken, this.oauthTokenSecret] = keyParts;
    logger.debug({ consumerKey: this.consumerKey }, 'MAAS API Consumer Key configured.');

    this.oauthClient = new OAuth(
      '',                           // requestTokenUrl - not used for direct API calls
      '',                           // accessTokenUrl - not used for direct API calls
      this.consumerKey,
      '',                           // consumerSecret - for PLAINTEXT with token, this is often empty.
      '1.0A',                       // version
      '',                           // authorize_callback - not used for direct API calls, but lib expects string
      'PLAINTEXT'                   // signatureMethod
    );
    logger.debug('MaasApiClient initialized.');
  }

  private generateAuthHeader(): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.oauthToken,
      oauth_signature_method: 'PLAINTEXT',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_nonce: randomBytes(16).toString('hex'),
      oauth_version: '1.0',
      oauth_signature: `&${encodeURIComponent(this.oauthTokenSecret)}`
    };

    logger.debug('Constructed OAuth parameters for Authorization header.', {
      consumer_key: oauthParams.oauth_consumer_key,
      token: oauthParams.oauth_token, // This is the access token, not the secret
      signature_method: oauthParams.oauth_signature_method,
      timestamp: oauthParams.oauth_timestamp,
      nonce_preview: oauthParams.oauth_nonce.substring(0, 8) + '...', // Preview of nonce
      version: oauthParams.oauth_version,
      // Note: oauth_signature (which includes the token_secret) is intentionally not logged here for security.
    });

    return 'OAuth ' + Object.entries(oauthParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=\"${encodeURIComponent(v)}\"`)
      .sort()
      .join(', ');
  }

  private async makeRequest<TResponse = any>(
    method: string,
    endpoint: string,
    queryParams?: MaasApiRequestParams,
    body?: BodyInit | null, // BodyInit is a standard Fetch API type, compatible with MaasApiRequestBody
    signal?: AbortSignal,
  ): Promise<MaasApiResponse<TResponse>> {
    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 1000;
    const RETRYABLE_STATUS_CODES: ReadonlySet<number> = new Set([429, 502, 503, 504]);

    const delayWithSignal = (ms: number, currentSignal?: AbortSignal): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (currentSignal?.aborted) {
          // Use DOMException for AbortError, consistent with fetch
          return reject(new DOMException('Aborted', 'AbortError'));
        }
        const timeoutId = setTimeout(resolve, ms);
        if (currentSignal) {
          currentSignal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true }); // Ensure listener is removed after firing
        }
      });
    };

    const parseRetryAfterHeader = (headerValue: string | null): number | null => {
      if (!headerValue) return null;
      const seconds = parseInt(headerValue, 10);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds * 1000; // Convert to milliseconds
      }
      // Attempt to parse as an HTTP-date
      const date = new Date(headerValue);
      if (!isNaN(date.getTime())) {
        const delay = date.getTime() - Date.now();
        return delay > 0 ? delay : null; // Only use if it's in the future
      }
      return null;
    };

    // Ensure endpoint starts with a slash for proper joining with /api/2.0
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.maasApiUrl}/api/2.0${cleanEndpoint}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: Error = new MaasApiError( // Default error if all retries fail without a specific last error
      `MAAS API request failed after ${MAX_RETRIES + 1} attempts for ${method} ${url.toString()}`,
      undefined,
      'max_retries_exceeded'
    );

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (signal?.aborted) {
        logger.warn(`MAAS API Request aborted before attempt ${attempt + 1}`, { method, url: url.toString() });
        throw new MaasApiError('Request aborted before attempt.', undefined, 'request_aborted');
      }
      
      const authHeader = this.generateAuthHeader();
      // Log OAuth params for debugging, be careful with sensitive data if any were directly included.
      // Here, oauth_token is logged, which is standard. The secret is used for the signature, not logged directly.
      logger.debug('Generated OAuth Authorization header parameters.', {
        consumerKey: this.consumerKey,
        token: this.oauthToken, // This is the oauth_token, not the secret
        signatureMethod: 'PLAINTEXT',
        // Nonce and timestamp are dynamic, not logging them here to reduce noise unless specifically needed.
        // The full signature includes the token secret but is not logged directly here for security.
      });

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Accept': 'application/json, text/plain, */*',
      };
  
      if (body && typeof body === 'string' && !headers['Content-Type']) { // Check if Content-Type not already set (e.g. by FormData)
        headers['Content-Type'] = 'application/json';
      } else if (body instanceof FormData) {
        // For FormData, 'Content-Type' is typically set automatically by fetch to 'multipart/form-data' with a boundary.
        // Explicitly setting it can sometimes cause issues, so we let fetch handle it.
        // However, MAAS might expect 'application/x-www-form-urlencoded' for some FormData-like structures if not files.
        // The current implementation in post/put converts objects to FormData, which is fine for file uploads or simple key-value.
        // If MAAS expects 'application/x-www-form-urlencoded' for non-file posts, body construction in post/put might need adjustment
        // to use URLSearchParams instead of FormData for those cases. For now, assume FormData is handled correctly by fetch.
      }


      const fetchOptions: RequestInit = {
        method,
        headers,
        body,
        signal,
      };

      logger.info(`MAAS API Request (Attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${method} ${url.toString()}`, {
        queryParams: queryParams ? JSON.stringify(queryParams) : undefined, // Stringify for better log structure
        hasBody: !!body,
        bodyType: body ? body.constructor.name : 'null',
        // Do not log 'body' itself here as it can be large or sensitive.
      });

      try {
        const response = await fetch(url.toString(), fetchOptions);

        if (response.status === 204) { // No Content
          logger.info({ method, url: url.toString(), responseStatus: response.status, attempt: attempt + 1 }, 'MAAS API request successful (No Content)');
          return undefined as MaasApiResponse<TResponse>; // Explicitly cast for undefined response
        }

        const responseText = await response.text();
        const contentTypeHeader = response.headers.get('content-type');

        if (!response.ok) {
          let errorBody: any = responseText;
          let maasErrorCode: string | undefined;
          let maasMessage: string | undefined;

          try {
            const parsedJson = JSON.parse(responseText);
            errorBody = parsedJson;
            if (typeof parsedJson === 'object' && parsedJson !== null) {
              maasMessage = parsedJson.message || parsedJson.error_description || parsedJson.detail;
              maasErrorCode = parsedJson.code || parsedJson.error_code;
            }
          } catch (e) {
            maasMessage = responseText.substring(0, 200);
          }
          
          const errorMessage = maasMessage || `MAAS API Request Failed: ${response.status} ${response.statusText}`;
          const currentApiError = new MaasApiError(errorMessage, response.status, maasErrorCode, errorBody);
          lastError = currentApiError; // Store this as the last known error

          logger.warn(`MAAS API Error (Attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${errorMessage}`, {
            method,
            url: url.toString(),
            status: response.status,
            maasErrorCode,
            responseTextPreview: responseText.substring(0, 200), // Log a preview of the error text
            isRetryable: RETRYABLE_STATUS_CODES.has(response.status || 0),
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES
          });

          if (attempt < MAX_RETRIES && response.status && RETRYABLE_STATUS_CODES.has(response.status)) {
            const retryAfterHeaderValue = response.headers.get('Retry-After');
            const parsedRetryAfterMs = parseRetryAfterHeader(retryAfterHeaderValue);
            
            const backoffDelayMs = INITIAL_DELAY_MS * (2 ** attempt);
            let delayMs = backoffDelayMs;

            if (parsedRetryAfterMs !== null && parsedRetryAfterMs > backoffDelayMs) {
              delayMs = parsedRetryAfterMs;
              logger.info(`Using Retry-After header for delay: ${delayMs}ms`, { method, url: url.toString(), attempt: attempt + 1 });
            }
            
            logger.info(`Retrying MAAS API Request (attempt ${attempt + 1} failed, next in ${delayMs}ms)...`, {
              method, url: url.toString(), status: response.status, error: errorMessage, attempt: attempt + 1, delayMs
            });
            await delayWithSignal(delayMs, signal);
            continue; // Next attempt
          }
          throw currentApiError; // Not retryable or max retries for API error
        }
        
        // Successful response
        logger.info({ method, url: url.toString(), responseStatus: response.status, contentType: contentTypeHeader, attempt: attempt + 1 }, 'MAAS API request successful');
        
        if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
          try {
            const jsonData = JSON.parse(responseText);
            // logger.debug({ method, url: url.toString(), dataPreview: JSON.stringify(jsonData).substring(0, 200) }, 'Parsed JSON response'); // Potentially too verbose/sensitive
            return jsonData as MaasApiResponse<TResponse>;
          } catch (parseError: any) {
            logger.error({
              message: 'Failed to parse JSON response', method, url: url.toString(), attempt: attempt + 1,
              contentTypeHeader,
              errorName: parseError.name,
              errorMessage: parseError.message,
              responseTextPreview: responseText.substring(0, 500)
            }, 'MAAS API JSON Parse Error');
            // This error is not typically retryable as the request itself was successful.
            throw new MaasApiError(
              `Failed to parse JSON response from ${url.toString()}: ${parseError.message}`,
              response.status, 'json_parse_error',
              { responseText: responseText.substring(0, 1000), originalError: parseError }
            );
          }
        }
        // logger.debug({ method, url: url.toString(), responseTextPreview: responseText.substring(0, 200) }, 'Received non-JSON response'); // Potentially too verbose
        return responseText as unknown as MaasApiResponse<TResponse>; // Return as text if not JSON

      } catch (error: any) {
        lastError = error; // Capture the error from this attempt

        if (signal?.aborted) {
          logger.warn(`MAAS API Request aborted during attempt ${attempt + 1} processing.`, { method, url: url.toString(), error: error.message });
          if (error.name === 'AbortError') throw error; // Rethrow original AbortError
          throw new MaasApiError('Request aborted during retry attempt processing.', undefined, 'request_aborted', { originalError: error });
        }

        // If it's a MaasApiError (e.g., from !response.ok or JSON parse failure), and it wasn't handled for retry above, it will be rethrown.
        // This primarily handles network errors from fetch() itself.
        const isNetworkError = !(error instanceof MaasApiError);

        if (attempt < MAX_RETRIES && isNetworkError) {
          const delayMs = INITIAL_DELAY_MS * (2 ** attempt);
          logger.warn(`MAAS API Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}) with network error. Retrying in ${delayMs}ms...`, {
            method, url: url.toString(), errorName: error.name, errorMessage: error.message, attempt: attempt + 1, delayMs
          });
          await delayWithSignal(delayMs, signal);
          continue; // Next attempt
        }
        
        // If it's a MaasApiError that wasn't retried, a non-retryable network error, or max retries for network error:
        logger.error(`MAAS API Request error not retried or max retries reached for network error (Attempt ${attempt + 1}). Error: ${error.message}`, {
            method, url: url.toString(), errorName: error.name, errorMessage: error.message, attempt: attempt + 1,
            isMaasApiError: error instanceof MaasApiError, statusCode: (error as MaasApiError).statusCode
        });
        throw error; // Rethrow to be handled by the final catch block (if any) or propagate
      }
    }

    // If loop completes, all retries failed.
    logger.error(`MAAS API Request failed definitively after ${MAX_RETRIES + 1} attempts for ${method} ${url.toString()}. Last error: ${lastError.message}`, {
        method, url: url.toString(),
        lastErrorName: lastError.name,
        lastErrorMessage: lastError.message,
        lastErrorStatus: (lastError as MaasApiError).statusCode,
        lastErrorDetails: (lastError as MaasApiError).details ? JSON.stringify((lastError as MaasApiError).details).substring(0,500) : undefined,
    });
    // The original outer catch block (lines 197-217 in original) will handle wrapping if lastError is not MaasApiError.
    // However, our lastError is likely already a MaasApiError or an AbortError.
    if (lastError instanceof MaasApiError || lastError.name === 'AbortError') {
        throw lastError;
    }
    // Fallback for unexpected errors not wrapped yet
    logger.error({
        method, url: url.toString(), errorName: lastError.name, errorMessage: lastError.message, stackPreview: lastError.stack?.substring(0, 300)
    }, 'MAAS API Fetch/Network Error (Final, unexpected type)');
    throw new MaasApiError(
        `Network or unexpected error during MAAS API request to ${method} ${url.toString()}: ${lastError.message}`,
        undefined, lastError.name === 'AbortError' ? 'request_aborted' : 'network_error',
        { originalErrorName: lastError.name, originalErrorMessage: lastError.message, stack: lastError.stack }
    );
  }

  /**
   * Sends a GET request to the MAAS API
   *
   * This method makes a GET request to the specified endpoint with optional query parameters.
   * It supports cancellation via AbortSignal and automatically handles authentication,
   * retries, and error normalization.
   *
   * @param endpoint - The API endpoint to call (e.g., '/machines/')
   * @param params - Optional query parameters to include in the request
   * @param signal - Optional AbortSignal for cancellation
   * @returns A promise that resolves to the response data
   *
   * @example
   * // Get all machines
   * const machines = await maasClient.get('/machines/');
   *
   * // Get machines with filters
   * const filteredMachines = await maasClient.get('/machines/', {
   *   hostname: 'web-server',
   *   status: 'Ready'
   * });
   *
   * // With abort signal
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 5000); // Abort after 5 seconds
   * try {
   *   const result = await maasClient.get('/machines/', undefined, controller.signal);
   * } catch (error) {
   *   if (error.name === 'AbortError') {
   *     console.log('Request was aborted');
   *   }
   * }
   */
  public async get<TResponse = any>(endpoint: string, params?: MaasApiRequestParams, signal?: AbortSignal): Promise<MaasApiResponse<TResponse>> {
    logger.debug(`GET request to ${endpoint}`, { params: params ? JSON.stringify(params) : undefined });
    return this.makeRequest<TResponse>('GET', endpoint, params, null, signal);
  }

  /**
   * Sends a POST request to the MAAS API
   *
   * This method makes a POST request to the specified endpoint with optional data.
   * It automatically converts JavaScript objects to form data for compatibility with
   * the MAAS API, which typically expects form-encoded data rather than JSON.
   *
   * @param endpoint - The API endpoint to call (e.g., '/machines/{system_id}/')
   * @param data - Optional data to send in the request body
   * @param signal - Optional AbortSignal for cancellation
   * @returns A promise that resolves to the response data
   *
   * @example
   * // Deploy a machine
   * const result = await maasClient.post(`/machines/${systemId}/`, {
   *   op: 'deploy',
   *   distro_series: 'jammy'
   * });
   *
   * // Create a tag
   * const tag = await maasClient.post('/tags/', {
   *   name: 'high-memory',
   *   comment: 'Machines with high memory capacity',
   *   definition: '//node[memory>8192]'
   * });
   */
  public async post<TResponse = any>(endpoint: string, data?: MaasApiRequestBody, signal?: AbortSignal): Promise<MaasApiResponse<TResponse>> {
    logger.debug(`POST request to ${endpoint}`, { hasData: !!data, dataType: data ? data.constructor.name : 'null' });
    let bodyToSend: BodyInit | null = null;

    if (data instanceof FormData || typeof data === 'string') {
      // Convert form-data package's FormData to a format compatible with fetch
      if (data instanceof FormData) {
        // Use the form-data package's getBuffer method to get the raw buffer
        bodyToSend = data.getBuffer() as unknown as BodyInit;
      } else {
        bodyToSend = data;
      }
      logger.debug(`Preparing body for POST: ${data.constructor.name}`, { endpoint });
    } else if (data && typeof data === 'object') {
      // Convert plain objects to FormData. MAAS often uses x-www-form-urlencoded for non-file posts.
      // If specific endpoints require JSON, the `data` should be pre-stringified and passed as string.
      // For now, this converts to FormData, which is suitable for key-value pairs or file uploads.
      const formData = new FormData();
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = (data as Record<string, any>)[key];
          if (value instanceof Blob) { // Handles File objects as well
            formData.append(key, value, (value as File).name); // Add filename for File objects
          } else if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !(value instanceof Blob)) {
              // MAAS typically doesn't expect nested JSON within FormData values unless it's a specific convention.
              // Stringifying here might not be what MAAS expects for all cases.
              // Consider if MAAS expects flattened keys or if JSON strings are acceptable.
              // For simplicity, keeping JSON.stringify for nested objects.
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        }
      }
      bodyToSend = formData.getBuffer() as unknown as BodyInit;
      logger.debug('Preparing body for POST: Converted object to FormData', { endpoint, keys: Object.keys(data) });
    } else if (data === null) {
      bodyToSend = null;
      logger.debug('Preparing body for POST: null', { endpoint });
    }
    // If data is undefined, bodyToSend remains null.
    
    return this.makeRequest<TResponse>('POST', endpoint, undefined, bodyToSend, signal);
  }

  /**
   * Sends a PUT request to the MAAS API
   *
   * This method makes a PUT request to the specified endpoint with optional data.
   * Like the post method, it automatically converts JavaScript objects to form data
   * for compatibility with the MAAS API.
   *
   * @param endpoint - The API endpoint to call (e.g., '/tags/{name}/')
   * @param data - Optional data to send in the request body
   * @param signal - Optional AbortSignal for cancellation
   * @returns A promise that resolves to the response data
   *
   * @example
   * // Update a tag
   * const updatedTag = await maasClient.put(`/tags/${tagName}/`, {
   *   comment: 'Updated comment',
   *   kernel_opts: 'console=ttyS0'
   * });
   */
  public async put<TResponse = any>(endpoint: string, data?: MaasApiRequestBody, signal?: AbortSignal): Promise<MaasApiResponse<TResponse>> {
    logger.debug(`PUT request to ${endpoint}`, { hasData: !!data, dataType: data ? data.constructor.name : 'null' });
    let bodyToSend: BodyInit | null = null;

    if (data instanceof FormData || typeof data === 'string') {
      // Convert form-data package's FormData to a format compatible with fetch
      if (data instanceof FormData) {
        // Use the form-data package's getBuffer method to get the raw buffer
        bodyToSend = data.getBuffer() as unknown as BodyInit;
      } else {
        bodyToSend = data;
      }
      logger.debug(`Preparing body for PUT: ${data.constructor.name}`, { endpoint });
    } else if (data && typeof data === 'object') {
      const formData = new FormData();
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const value = (data as Record<string, any>)[key];
          if (value instanceof Blob) {
            formData.append(key, value, (value as File).name);
          } else if (value !== undefined && value !== null) {
             if (typeof value === 'object' && !(value instanceof Blob)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        }
      }
      bodyToSend = formData.getBuffer() as unknown as BodyInit;
      logger.debug('Preparing body for PUT: Converted object to FormData', { endpoint, keys: Object.keys(data) });
    } else if (data === null) {
      bodyToSend = null;
      logger.debug('Preparing body for PUT: null', { endpoint });
    }
    
    return this.makeRequest<TResponse>('PUT', endpoint, undefined, bodyToSend, signal);
  }

  /**
   * Sends a DELETE request to the MAAS API
   *
   * This method makes a DELETE request to the specified endpoint with optional query parameters.
   * It returns an optional response type since DELETE operations often return 204 No Content.
   *
   * @param endpoint - The API endpoint to call (e.g., '/machines/{system_id}/')
   * @param queryParams - Optional query parameters to include in the request
   * @param signal - Optional AbortSignal for cancellation
   * @returns A promise that resolves to the response data or undefined for 204 responses
   *
   * @example
   * // Delete a machine
   * await maasClient.delete(`/machines/${systemId}/`);
   *
   * // Delete a tag
   * await maasClient.delete(`/tags/${tagName}/`);
   *
   * // Delete with query parameters
   * await maasClient.delete('/resource/', { force: true });
   */
  public async delete<TResponse = any>(endpoint: string, queryParams?: MaasApiRequestParams, signal?: AbortSignal): Promise<MaasApiOptionalResponse<TResponse>> {
    logger.debug(`DELETE request to ${endpoint}`, { queryParams: queryParams ? JSON.stringify(queryParams) : undefined });
    // DELETE can often result in 204 No Content, so use MaasApiOptionalResponse
    return this.makeRequest<TResponse>('DELETE', endpoint, queryParams, null, signal);
  }

  /**
   * Sends a multipart/form-data POST request to the MAAS API
   *
   * This method is specifically designed for uploading files and other binary data
   * to the MAAS API using multipart/form-data encoding. It's commonly used for
   * uploading boot images, scripts, and other files.
   *
   * @param endpoint - API endpoint to call (e.g., '/boot-resources/')
   * @param formData - FormData object containing the multipart data
   * @param signal - Optional AbortSignal for cancellation
   * @returns A promise that resolves to the response data
   *
   * @example
   * // Upload a script
   * const formData = new FormData();
   * formData.append('name', 'my-script');
   * formData.append('type', 'testing');
   * formData.append('script', new Blob([scriptContent], { type: 'text/plain' }), 'script.sh');
   *
   * const result = await maasClient.postMultipart('/scripts/', formData);
   *
   * @example
   * // Upload a boot image
   * const formData = new FormData();
   * formData.append('name', 'custom-kernel');
   * formData.append('architecture', 'amd64');
   * formData.append('type', 'boot-kernel');
   * formData.append('file', new Blob([imageData], { type: 'application/octet-stream' }), 'kernel');
   *
   * const result = await maasClient.postMultipart('/boot-resources/', formData);
   */
  public async postMultipart<TResponse = any>(endpoint: string, formData: FormData, signal?: AbortSignal): Promise<MaasApiResponse<TResponse>> {
    logger.debug(`POST multipart request to ${endpoint}`, {
      formDataFields: Object.keys(formData.getHeaders()).join(', ')
    });
    
    const url = new URL(`${this.maasApiUrl}/api/2.0${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
    const authHeader = this.generateAuthHeader();
    
    const headers: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': 'application/json, text/plain, */*',
      ...formData.getHeaders() // This adds the Content-Type with boundary
    };
    
    logger.info(`MAAS API Multipart Request: POST ${url.toString()}`, {
      hasFormData: true,
      formDataFields: Object.keys(formData.getHeaders()).join(', ')
    });
    
    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: formData.getBuffer() as unknown as BodyInit,
        signal
      });
      
      if (response.status === 204) { // No Content
        logger.info({ endpoint, responseStatus: response.status }, 'MAAS API multipart request successful (No Content)');
        return undefined as MaasApiResponse<TResponse>;
      }
      
      const responseText = await response.text();
      const contentTypeHeader = response.headers.get('content-type');
      
      if (!response.ok) {
        let errorBody: any = responseText;
        let errorMessage = `MAAS API Multipart Request Failed: ${response.status} ${response.statusText}`;
        
        try {
          const parsedJson = JSON.parse(responseText);
          errorBody = parsedJson;
          if (typeof parsedJson === 'object' && parsedJson !== null) {
            const maasMessage = parsedJson.message || parsedJson.error_description || parsedJson.detail;
            if (maasMessage) errorMessage = maasMessage;
          }
        } catch (e) {
          // If not JSON, use the text response
          errorMessage = responseText.substring(0, 200);
        }
        
        logger.error(`MAAS API Multipart Error: ${errorMessage}`, {
          endpoint,
          status: response.status,
          responseTextPreview: responseText.substring(0, 200)
        });
        
        throw new MaasApiError(errorMessage, response.status);
      }
      
      // Successful response
      logger.info({ endpoint, responseStatus: response.status, contentType: contentTypeHeader }, 'MAAS API multipart request successful');
      
      if (contentTypeHeader && contentTypeHeader.includes('application/json')) {
        try {
          return JSON.parse(responseText) as MaasApiResponse<TResponse>;
        } catch (parseError: any) {
          logger.error({
            message: 'Failed to parse JSON response from multipart request',
            endpoint,
            errorName: parseError.name,
            errorMessage: parseError.message,
            responseTextPreview: responseText.substring(0, 500)
          }, 'MAAS API JSON Parse Error');
          
          throw new MaasApiError(
            `Failed to parse JSON response from multipart request to ${endpoint}: ${parseError.message}`,
            response.status
          );
        }
      }
      
      return responseText as unknown as MaasApiResponse<TResponse>;
    } catch (error: any) {
      if (error instanceof MaasApiError) {
        throw error;
      }
      
      logger.error(`MAAS API Multipart Request error: ${error.message}`, {
        endpoint,
        errorName: error.name,
        errorMessage: error.message
      });
      
      throw new MaasApiError(
        `Network or unexpected error during MAAS API multipart request to ${endpoint}: ${error.message}`,
        undefined
      );
    }
  }
}