const FormData = require('form-data');
const { MaasApiError } = require('../utils/errorHandler');
const { createRequestLogger } = require('../utils/logger');

/**
 * Options for file upload
 */
const FileUploadOptions = {
  /** Field name for the file in the form */
  fieldName: 'file',
  /** Content type of the file */
  contentType: 'application/octet-stream',
  /** Filename to use in the form */
  filename: 'file'
};

/**
 * Create a multipart form data object
 * @returns {FormData} A new FormData instance
 */
function createMultipartFormData() {
  return new FormData();
}

/**
 * Create a multipart form data object with a file
 * @param {Buffer|ReadStream} fileData - The file data as a Buffer or ReadStream
 * @param {Object} options - Options for the file upload
 * @returns {FormData} A FormData instance with the file added
 */
function createMultipartFormDataWithFile(fileData, options = {}) {
  const logger = createRequestLogger('multipart');
  const opts = { ...FileUploadOptions, ...options };
  
  try {
    const formData = new FormData();
    formData.append(
      opts.fieldName,
      fileData,
      {
        filename: opts.filename,
        contentType: opts.contentType
      }
    );
    
    return formData;
  } catch (error) {
    logger.error({ error }, 'Error creating multipart form data');
    throw new MaasApiError('Failed to create multipart form data', 500, { originalError: error });
  }
}

module.exports = {
  createMultipartFormData,
  createMultipartFormDataWithFile
};