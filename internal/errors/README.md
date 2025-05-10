# Error Handling System

This package provides a consistent error handling system for the MCP server application with appropriate error types and HTTP status code mapping.

## Features

- Custom error types with type information
- Error wrapping and unwrapping
- HTTP status code mapping
- Consistent error response format
- Utility functions for error handling in HTTP handlers

## Error Types

The following error types are defined:

- `ValidationError`: For input validation errors (maps to HTTP 400)
- `NotFoundError`: For resource not found errors (maps to HTTP 404)
- `AuthenticationError`: For authentication/authorization errors (maps to HTTP 401)
- `MaasClientError`: For errors from the MAAS client (maps to HTTP 502)
- `InternalError`: For internal server errors (maps to HTTP 500)

## Usage Examples

### Creating Errors

```go
// Create a simple error
err := errors.NewValidationError("invalid input", nil)

// Create an error with a cause
cause := errors.New("original error")
err := errors.NewNotFoundError("resource not found", cause)
```

### Error Wrapping and Unwrapping

```go
// Create a chain of errors
originalErr := errors.New("original error")
validationErr := errors.NewValidationError("validation failed", originalErr)
internalErr := errors.NewInternalError("operation failed", validationErr)

// Unwrap to get the cause
cause := errors.Unwrap(internalErr) // Returns validationErr

// Check if an error is of a specific type
if errors.Is(err, &errors.AppError{Type: errors.ErrorTypeValidation}) {
    // Handle validation error
}

// Extract the typed error
var appErr *errors.AppError
if errors.As(err, &appErr) {
    // Use appErr.Type, appErr.Message, etc.
}
```

### HTTP Status Code Mapping

```go
// Get the appropriate HTTP status code for an error
statusCode := errors.HTTPStatusCodeForError(err)
```

### Error Response Formatting

```go
// Create a standardized error response
response := errors.NewErrorResponse(err)
```

### Using with Gin Handlers

```go
func GetResource(c *gin.Context) {
    id := c.Param("id")
    resource, err := service.GetResource(id)
    if err != nil {
        // Handle the error with the appropriate utility function
        errors.GinErrorResponse(c, err)
        return
    }
    
    c.JSON(http.StatusOK, resource)
}
```

### Specific Error Handling Utilities

```go
// Handle a validation error
errors.GinBadRequest(c, "Invalid input parameters", err)

// Handle a not found error
errors.GinNotFoundWithMessage(c, "Resource not found", err)

// Handle an authentication error
errors.GinUnauthorized(c, "Invalid credentials", err)

// Handle a forbidden error
errors.GinForbidden(c, "Insufficient permissions", err)

// Handle a MAAS client error
errors.GinMaasClientError(c, "Error communicating with MAAS", err)

// Handle an internal server error
errors.GinInternalServerError(c, err)

// Abort a request with an error
errors.GinAbortWithError(c, err)
```

## Migration from ServiceError

If you're transitioning from the existing `service.ServiceError` system to this new error handling system, the package provides utility functions to help with the migration:

### Converting from ServiceError to AppError

```go
// Convert a service.ServiceError to an AppError
serviceErr := &service.ServiceError{
    Err:        service.ErrNotFound,
    StatusCode: http.StatusNotFound,
    Message:    "Resource not found",
}
appErr := errors.FromServiceError(serviceErr)
```

### Converting from AppError to ServiceError

```go
// Convert an AppError to a service.ServiceError (for backward compatibility)
appErr := errors.NewValidationError("Invalid input", nil)
serviceErr := errors.ToServiceError(appErr)
```

## Updating Existing Code

When updating existing code to use the new error handling system:

1. Replace direct HTTP status code responses with the appropriate error utility:
   ```go
   // Before
   c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
   
   // After
   errors.GinBadRequest(c, "Invalid input", nil)
   ```

2. Update error handling in handlers:
   ```go
   // Before
   if err != nil {
       if serviceErr, ok := err.(*service.ServiceError); ok {
           c.JSON(serviceErr.StatusCode, gin.H{"error": serviceErr.Error()})
           return
       }
       c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
       return
   }
   
   // After
   if err != nil {
       errors.GinErrorResponse(c, err)
       return
   }
   ```

3. Create errors with the appropriate type:
   ```go
   // Before
   return &service.ServiceError{
       Err:        service.ErrNotFound,
       StatusCode: http.StatusNotFound,
       Message:    "Resource not found",
   }
   
   // After
   return errors.NewNotFoundError("Resource not found", nil)
   ```

## Best Practices

1. **Use the appropriate error type**: Choose the error type that best describes the error situation.
2. **Include meaningful error messages**: Error messages should be clear and descriptive.
3. **Wrap errors with context**: When propagating errors up the call stack, wrap them with additional context.
4. **Don't expose sensitive information**: Ensure error messages don't contain sensitive information.
5. **Log detailed errors internally**: Log detailed error information for debugging, but return sanitized errors to clients.