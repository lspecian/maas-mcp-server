import { ZodError, z, ZodSchema, ZodTypeAny } from 'zod';
import {
  extractAndValidateParams,
  validateResourceData,
  handleResourceFetchError,
} from '../../mcp_resources/utils/resourceUtils.js'; // Assuming .js extension based on project setup
import { MaasApiError } from '../../types/maas.js'; // Assuming .js extension
import logger from '../../utils/logger.js'; // Assuming .js extension

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  __esModule: true, // Use this if logger.js is an ES module
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
  generateRequestId: jest.fn().mockReturnValue('test-request-id'),
}));

// Mock the audit logger
jest.mock('../../utils/auditLogger.js', () => ({
  __esModule: true,
  default: {
    logResourceAccess: jest.fn(),
    logResourceAccessFailure: jest.fn(),
    logResourceModification: jest.fn(),
    logResourceModificationFailure: jest.fn(),
    logCacheOperation: jest.fn(),
  },
}));

// Mock extractParamsFromUri from uriPatterns.js
// We need to control its return value for testing extractAndValidateParams
jest.mock('../../mcp_resources/schemas/uriPatterns.js', () => {
  const actualUriPatterns = jest.requireActual('../../mcp_resources/schemas/uriPatterns.js');
  return {
    ...actualUriPatterns, // Keep other exports like actual URI pattern strings
    extractParamsFromUri: jest.fn(), // Mock this specific function
  };
});
// Import the mocked function to control it in tests
import { extractParamsFromUri as mockExtractParamsFromUri } from '../../mcp_resources/schemas/uriPatterns.js';


describe('Resource Utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractAndValidateParams', () => {
    const mockPattern = 'test://resource/{id}/item/{itemId}';
    // Schema with a transformation
    const mockSchemaWithTransform: z.ZodType<{ id: string; itemId: number }, z.ZodTypeDef, { id: string; itemId: string }> = z.object({
      id: z.string().min(1, "ID cannot be empty"),
      itemId: z.string().regex(/^\d+$/, "Item ID must be a string of digits").transform(Number),
    });
    const resourceName = 'TestResource';

    it('should extract and validate parameters successfully with transformation', () => {
      (mockExtractParamsFromUri as jest.Mock).mockReturnValue({ id: 'abc', itemId: '123' });
      const uri = 'test://resource/abc/item/123';
      // Cast schema to ZodTypeAny to satisfy the generic constraint in tests, as ZodSchema<T> implies T_in = T_out
      const params = extractAndValidateParams(uri, mockPattern, mockSchemaWithTransform as ZodTypeAny, resourceName);
      expect(mockExtractParamsFromUri).toHaveBeenCalledWith(uri, mockPattern);
      expect(params).toEqual({ id: 'abc', itemId: 123 }); // Transformed itemId
    });

    it('should throw MaasApiError for ZodError during validation (e.g., regex fail)', () => {
      (mockExtractParamsFromUri as jest.Mock).mockReturnValue({ id: 'abc', itemId: 'invalid-id' }); // itemId does not match regex
      const uri = 'test://resource/abc/item/invalid-id';
      expect(() => extractAndValidateParams(uri, mockPattern, mockSchemaWithTransform as ZodTypeAny, resourceName))
        .toThrowError(new MaasApiError(`Invalid parameters for ${resourceName} request`, 400, 'invalid_parameters', expect.any(Object)));
      expect(logger.error).toHaveBeenCalledWith(
        `Invalid parameters for ${resourceName} request`,
        expect.objectContaining({ issues: expect.any(Array) })
      );
    });
    
    it('should throw MaasApiError for ZodError during validation (e.g., min length fail)', () => {
      (mockExtractParamsFromUri as jest.Mock).mockReturnValue({ id: '', itemId: '123' }); // id is empty
      const uri = 'test://resource//item/123';
       try {
        extractAndValidateParams(uri, mockPattern, mockSchemaWithTransform as ZodTypeAny, resourceName)
      } catch (e: any) {
        expect(e).toBeInstanceOf(MaasApiError);
        expect(e.message).toBe(`Invalid parameters for ${resourceName} request`);
        expect(e.statusCode).toBe(400);
        expect(e.maasErrorCode).toBe('invalid_parameters');
        expect(e.details.zodErrors[0].path).toEqual(['id']);
      }
    });

    it('should re-throw MaasApiError if extractParamsFromUri throws it', () => {
      const originalError = new MaasApiError('Extraction failed specifically', 400, 'extraction_error_test');
      (mockExtractParamsFromUri as jest.Mock).mockImplementation(() => {
        throw originalError;
      });
      const uri = 'test://resource/abc/item/123';
      expect(() => extractAndValidateParams(uri, mockPattern, mockSchemaWithTransform as ZodTypeAny, resourceName))
        .toThrow(originalError);
    });
    
    it('should wrap other errors from extractParamsFromUri in MaasApiError', () => {
      const originalError = new Error('Some other extraction error');
      (mockExtractParamsFromUri as jest.Mock).mockImplementation(() => {
        throw originalError;
      });
      const uri = 'test://resource/abc/item/123';
      expect(() => extractAndValidateParams(uri, mockPattern, mockSchemaWithTransform as ZodTypeAny, resourceName))
        .toThrowError(new MaasApiError(`Error processing ${resourceName} request: ${originalError.message}`, 500, 'unexpected_error'));
      expect(logger.error).toHaveBeenCalledWith(`Error processing ${resourceName} request: ${originalError.message}`);
    });
  });

  describe('validateResourceData', () => {
    const mockSchema = z.object({
      name: z.string(),
      value: z.number(),
    });
    const resourceName = 'SampleData';

    it('should validate data successfully', () => {
      const data = { name: 'Test', value: 100 };
      const validatedData = validateResourceData(data, mockSchema, resourceName);
      expect(validatedData).toEqual(data);
    });

    it('should throw MaasApiError with 422 for ZodError during validation', () => {
      const invalidData = { name: 'Test', value: 'not-a-number' }; // value should be number
      expect(() => validateResourceData(invalidData, mockSchema, resourceName))
        .toThrowError(new MaasApiError(
          `${resourceName} data validation failed: The MAAS API returned data in an unexpected format`,
          422, // Unprocessable Entity
          'validation_error',
          expect.any(Object)
        ));
      expect(logger.error).toHaveBeenCalledWith(
        `${resourceName} data validation failed`,
        expect.objectContaining({ issues: expect.any(Array) })
      );
    });

    it('should include resourceId in error message if provided', () => {
      const invalidData = { name: 'Test', value: 'not-a-number' };
      const resourceId = 'test-id-123';
      expect(() => validateResourceData(invalidData, mockSchema, resourceName, resourceId))
        .toThrowError(new MaasApiError(
          `${resourceName} data validation failed for '${resourceId}': The MAAS API returned data in an unexpected format`,
          422,
          'validation_error',
          expect.any(Object)
        ));
    });
    
    it('should re-throw non-ZodErrors', () => {
      const customError = new Error('A custom non-zod error');
      const mockFailingSchema = {
        parse: jest.fn().mockImplementation(() => {
          throw customError;
        }),
      } as unknown as ZodSchema<any>; // Use ZodSchema<any> for this specific mock
      expect(() => validateResourceData({}, mockFailingSchema, resourceName)).toThrow(customError);
    });
  });

  describe('handleResourceFetchError', () => {
    const resourceName = 'MyResource';
    const resourceId = 'my-id-1';
    const context = { operation: 'fetch' };

    it('should re-throw MaasApiError and log it', () => {
      const originalError = new MaasApiError('Original MAAS Error', 503, 'maas_down');
      expect(() => handleResourceFetchError(originalError, resourceName, resourceId, context))
        .toThrow(originalError);
      expect(logger.error).toHaveBeenCalledWith(
        `MAAS API error fetching ${resourceName} for ${resourceId}: ${originalError.message}`,
        expect.objectContaining({ statusCode: 503, errorCode: 'maas_down', ...context })
      );
    });

    it('should throw specific MaasApiError (404) for resource not found when resourceId is present', () => {
      const originalError = new MaasApiError('Not Found from MAAS', 404, 'maas_not_found');
      expect(() => handleResourceFetchError(originalError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(`${resourceName} '${resourceId}' not found`, 404, 'resource_not_found'));
    });
    
    it('should re-throw original 404 MaasApiError if resourceId is not present', () => {
      const originalError = new MaasApiError('Generic Not Found', 404, 'generic_not_found_maas');
      expect(() => handleResourceFetchError(originalError, resourceName, undefined, context))
        .toThrow(originalError);
    });

    it('should handle AbortError and throw MaasApiError (499)', () => {
      const abortError = new Error('Request was aborted by user');
      abortError.name = 'AbortError';
      expect(() => handleResourceFetchError(abortError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(
          `${resourceName} request for ${resourceId} was aborted by the client`,
          499,
          'request_aborted'
        ));
      expect(logger.warn).toHaveBeenCalledWith(
        `${resourceName} request for ${resourceId} was aborted`,
        context
      );
    });

    it('should handle ECONNREFUSED network error and throw MaasApiError (503)', () => {
      const networkError = new Error('Connection refused by server');
      (networkError as any).cause = { code: 'ECONNREFUSED', errno: -111 };
      expect(() => handleResourceFetchError(networkError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(
          'Failed to connect to MAAS API: Network connectivity issue',
          503,
          'network_error',
          { originalError: networkError.message }
        ));
      expect(logger.error).toHaveBeenCalledWith(
        `Network error fetching ${resourceName} for ${resourceId}: ${networkError.message}`,
        expect.objectContaining({ code: 'ECONNREFUSED', ...context })
      );
    });
    
    it('should handle ENOTFOUND network error and throw MaasApiError (503)', () => {
      const networkError = new Error('DNS lookup failed for server');
      (networkError as any).cause = { code: 'ENOTFOUND' };
      expect(() => handleResourceFetchError(networkError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(
          'Failed to connect to MAAS API: Network connectivity issue',
          503,
          'network_error',
          { originalError: networkError.message }
        ));
    });

    it('should handle ETIMEDOUT error and throw MaasApiError (504)', () => {
      const timeoutError = new Error('MAAS API request timed out');
      (timeoutError as any).cause = { code: 'ETIMEDOUT' };
      expect(() => handleResourceFetchError(timeoutError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(
          `MAAS API request timed out while fetching ${resourceName} for ${resourceId}`,
          504,
          'request_timeout',
          { originalError: timeoutError.message }
        ));
      expect(logger.error).toHaveBeenCalledWith(
        `Timeout error fetching ${resourceName} for ${resourceId}: ${timeoutError.message}`,
        context
      );
    });

    it('should handle generic errors and throw MaasApiError (500)', () => {
      const genericError = new Error('Something unexpected went wrong');
      expect(() => handleResourceFetchError(genericError, resourceName, resourceId, context))
        .toThrowError(new MaasApiError(
          `Could not fetch ${resourceName} for ${resourceId}: ${genericError.message}`,
          500,
          'unexpected_error',
          { originalError: genericError.message }
        ));
      expect(logger.error).toHaveBeenCalledWith(
        `Unexpected error fetching ${resourceName} for ${resourceId}: ${genericError.message}`,
        expect.objectContaining({ stack: genericError.stack, ...context })
      );
    });
  });
});