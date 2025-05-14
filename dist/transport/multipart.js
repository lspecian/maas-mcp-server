"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_data_1 = __importDefault(require("form-data"));
const errorHandler_js_1 = require("../utils/errorHandler.js");
const logger_js_1 = require("../utils/logger.js");
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
    return new form_data_1.default();
}
/**
 * Create a multipart form data object with a file
 * @param {Buffer|ReadStream} fileData - The file data as a Buffer or ReadStream
 * @param {Object} options - Options for the file upload
 * @returns {FormData} A FormData instance with the file added
 */
function createMultipartFormDataWithFile(fileData, options = {}) {
    const logger = (0, logger_js_1.createRequestLogger)('multipart');
    const opts = { ...FileUploadOptions, ...options };
    try {
        const formData = new form_data_1.default();
        formData.append(opts.fieldName, fileData, {
            filename: opts.filename,
            contentType: opts.contentType
        });
        return formData;
    }
    catch (error) {
        logger.error({ error }, 'Error creating multipart form data');
        throw new errorHandler_js_1.MaasApiError('Failed to create multipart form data', 500, { originalError: error });
    }
}
module.exports = {
    createMultipartFormData,
    createMultipartFormDataWithFile
};
