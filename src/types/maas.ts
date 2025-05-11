/**
 * @file Defines TypeScript interfaces and types specific to the MAAS API client and its interactions.
 */

import { randomBytes } from 'crypto'; // Needed for MaasApiError if it were to regenerate nonce, but not for current structure.
                                     // Keeping for potential future use or if other utilities are added here.
                                     // For MaasApiError as moved, it doesn't directly use randomBytes.

/**
 * Configuration options for the {@link MaasApiClient}.
 * These are typically sourced from a central configuration module.
 */
export interface MaasApiClientConfig {
  /**
   * The base URL of the MAAS API.
   * @example "http://your-maas-server:5240/MAAS"
   */
  maasApiUrl: string;

  /**
   * The MAAS API key, typically a combination of consumer key, token, and token secret.
   * Format: "<consumer_key>:<token>:<token_secret>"
   */
  maasApiKey: string;

  // Optional, if we want to allow passing them separately
  /**
   * The OAuth consumer key.
   * Extracted from `maasApiKey` if not provided directly.
   * @optional
   */
  consumerKey?: string;

  /**
   * The OAuth token.
   * Extracted from `maasApiKey` if not provided directly.
   * @optional
   */
  oauthToken?: string;

  /**
   * The OAuth token secret.
   * Extracted from `maasApiKey` if not provided directly.
   * @optional
   */
  oauthTokenSecret?: string;
}

/**
 * Represents an error originating from the MAAS API or the client itself.
 * It extends the native `Error` class with MAAS-specific details.
 */
export class MaasApiError extends Error {
  /**
   * The HTTP status code returned by the MAAS API, if applicable.
   */
  public statusCode?: number;

  /**
   * A MAAS-specific error code string, if provided in the API response.
   * @example "invalid_machine_id"
   */
  public maasErrorCode?: string;

  /**
   * Additional details about the error. This can be the parsed error response
   * from the MAAS API or other contextual information.
   */
  public details?: any;

  /**
   * Creates an instance of MaasApiError.
   * @param message - A human-readable description of the error.
   * @param statusCode - The HTTP status code from the API response.
   * @param maasErrorCode - A MAAS-specific error code.
   * @param details - Additional error details.
   */
  constructor(
    message: string,
    statusCode?: number,
    maasErrorCode?: string,
    details?: any
  ) {
    super(message);
    this.name = 'MaasApiError';
    this.statusCode = statusCode;
    this.maasErrorCode = maasErrorCode;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, MaasApiError.prototype);
    } else {
      (this as any).__proto__ = MaasApiError.prototype;
    }
  }
}

/**
 * Generic type for query parameters in MAAS API GET/DELETE requests.
 * Allows any string key with values that can be string, number, or boolean.
 */
export type MaasApiRequestParams = Record<string, string | number | boolean>;

/**
 * Generic type for the body of MAAS API POST/PUT requests.
 * Can be a plain object, FormData, a string (e.g., pre-serialized JSON), or null.
 */
export type MaasApiRequestBody = Record<string, any> | FormData | string | null;

/**
 * Represents a generic successful response from the MAAS API.
 * @template T - The expected type of the data in the response body.
 */
export type MaasApiResponse<T> = T;

/**
 * Represents a response that might contain no content (e.g., HTTP 204).
 * @template T - The expected type of the data if content is present.
 */
export type MaasApiOptionalResponse<T> = T | undefined;