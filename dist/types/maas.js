"use strict";
/**
 * @file Defines TypeScript interfaces and types specific to the MAAS API client and its interactions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaasApiError = void 0;
/**
 * Represents an error originating from the MAAS API or the client itself.
 * It extends the native `Error` class with MAAS-specific details.
 */
class MaasApiError extends Error {
    /**
     * The HTTP status code returned by the MAAS API, if applicable.
     */
    statusCode;
    /**
     * A MAAS-specific error code string, if provided in the API response.
     * @example "invalid_machine_id"
     */
    maasErrorCode;
    /**
     * Additional details about the error. This can be the parsed error response
     * from the MAAS API or other contextual information.
     */
    details;
    /**
     * Creates an instance of MaasApiError.
     * @param message - A human-readable description of the error.
     * @param statusCode - The HTTP status code from the API response.
     * @param maasErrorCode - A MAAS-specific error code.
     * @param details - Additional error details.
     */
    constructor(message, statusCode, maasErrorCode, details) {
        super(message);
        this.name = 'MaasApiError';
        this.statusCode = statusCode;
        this.maasErrorCode = maasErrorCode;
        this.details = details;
        // Ensure proper prototype chain for instanceof checks
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, MaasApiError.prototype);
        }
        else {
            this.__proto__ = MaasApiError.prototype;
        }
    }
}
exports.MaasApiError = MaasApiError;
