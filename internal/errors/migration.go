package errors

import (
	"github.com/lspecian/maas-mcp-server/internal/service"
)

// FromServiceError converts a service.ServiceError to the appropriate AppError type
// This is a utility function to help with migration from the old error system to the new one
func FromServiceError(serviceErr *service.ServiceError) *AppError {
	switch serviceErr.Err {
	case service.ErrNotFound:
		return NewNotFoundError(serviceErr.Message, serviceErr.Err)
	case service.ErrBadRequest:
		return NewValidationError(serviceErr.Message, serviceErr.Err)
	case service.ErrForbidden:
		return NewAuthenticationError(serviceErr.Message, serviceErr.Err)
	case service.ErrServiceUnavailable, service.ErrConflict:
		return NewMaasClientError(serviceErr.Message, serviceErr.Err)
	default:
		return NewInternalError(serviceErr.Message, serviceErr.Err)
	}
}

// ToServiceError converts an AppError to a service.ServiceError
// This is a utility function to help with migration from the new error system to the old one
// if needed for backward compatibility
func ToServiceError(appErr *AppError) *service.ServiceError {
	var serviceErr *service.ServiceError

	switch appErr.Type {
	case ErrorTypeNotFound:
		serviceErr = &service.ServiceError{
			Err:        service.ErrNotFound,
			StatusCode: HTTPStatusCodeForError(appErr),
			Message:    appErr.Message,
		}
	case ErrorTypeValidation:
		serviceErr = &service.ServiceError{
			Err:        service.ErrBadRequest,
			StatusCode: HTTPStatusCodeForError(appErr),
			Message:    appErr.Message,
		}
	case ErrorTypeAuthentication:
		serviceErr = &service.ServiceError{
			Err:        service.ErrForbidden,
			StatusCode: HTTPStatusCodeForError(appErr),
			Message:    appErr.Message,
		}
	case ErrorTypeMaasClient:
		serviceErr = &service.ServiceError{
			Err:        service.ErrServiceUnavailable,
			StatusCode: HTTPStatusCodeForError(appErr),
			Message:    appErr.Message,
		}
	default:
		serviceErr = &service.ServiceError{
			Err:        service.ErrInternalServer,
			StatusCode: HTTPStatusCodeForError(appErr),
			Message:    appErr.Message,
		}
	}

	return serviceErr
}
