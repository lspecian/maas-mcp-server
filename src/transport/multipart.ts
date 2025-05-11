import FormData from 'form-data';
import { MaasApiError } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Options for file upload
 */
export interface FileUploadOptions {
  /** Field name for the file in the form */
  fieldName: string;
  /** Name of the file */
  fileName: string;
  /** Content of the file as Buffer or string */
  fileContent: Buffer | string;
  /** Content type of the file */
  contentType?: string;
  /** Maximum allowed file size in bytes */
  maxSizeBytes?: number;
  /** List of allowed content types */
  allowedTypes?: string[];
}

/**
 * Validates a file upload against size and type constraints
 * @param options File upload options containing validation constraints
 * @throws {MaasApiError} If validation fails
 */
export function validateFileUpload(options: FileUploadOptions): void {
  const logContext = {
    fileName: options.fileName,
    fieldName: options.fieldName,
    contentType: options.contentType,
    fileSize: Buffer.isBuffer(options.fileContent) 
      ? options.fileContent.length 
      : Buffer.byteLength(options.fileContent)
  };

  logger.debug({ ...logContext }, 'Validating file upload');

  // Validate file size if maxSizeBytes is specified
  if (options.maxSizeBytes && logContext.fileSize > options.maxSizeBytes) {
    logger.warn({ 
      ...logContext, 
      maxSize: options.maxSizeBytes 
    }, 'File size exceeds maximum allowed size');
    
    throw new MaasApiError(
      `File size exceeds maximum allowed size of ${options.maxSizeBytes} bytes`,
      400
    );
  }
  
  // Validate content type if allowedTypes is specified
  if (options.allowedTypes && options.allowedTypes.length > 0 && options.contentType) {
    if (!options.allowedTypes.includes(options.contentType)) {
      logger.warn({ 
        ...logContext, 
        allowedTypes: options.allowedTypes 
      }, 'File type not allowed');
      
      throw new MaasApiError(
        `File type ${options.contentType} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
        400
      );
    }
  }

  logger.debug({ ...logContext }, 'File validation passed');
}

/**
 * Creates a multipart form data object for file upload
 * @param options File upload options
 * @param additionalFields Additional form fields to include
 * @returns FormData object ready for submission
 */
export function createMultipartFormData(
  options: FileUploadOptions, 
  additionalFields?: Record<string, string>
): FormData {
  // Validate file before creating form data
  validateFileUpload(options);
  
  // Create form data
  const formData = new FormData();
  
  // Add file
  formData.append(
    options.fieldName,
    options.fileContent,
    {
      filename: options.fileName,
      contentType: options.contentType
    }
  );
  
  // Add additional fields if provided
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  logger.debug({
    fileName: options.fileName,
    fieldName: options.fieldName,
    additionalFieldCount: additionalFields ? Object.keys(additionalFields).length : 0
  }, 'Created multipart form data');
  
  return formData;
}

/**
 * Gets headers required for multipart form data submission
 * @param formData The FormData object
 * @returns Headers object with Content-Type and other necessary headers
 */
export function getMultipartHeaders(formData: FormData): Record<string, string> {
  return {
    ...formData.getHeaders()
  };
}