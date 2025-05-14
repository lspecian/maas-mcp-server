package logging

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	rotatelogs "github.com/lestrrat-go/file-rotatelogs"
	"github.com/sirupsen/logrus"
)

// LogFormat represents the output format for logs
type LogFormat string

// Log formats
const (
	LogFormatJSON LogFormat = "json"
	LogFormatText LogFormat = "text"
)

// ContextKey is a type for context keys
type ContextKey string

// Context keys
const (
	CorrelationIDKey ContextKey = "correlation_id"
	RequestIDKey     ContextKey = "request_id"
	UserIDKey        ContextKey = "user_id"
	SessionIDKey     ContextKey = "session_id"
)

// Logger is a wrapper around logrus.Logger with additional functionality
type Logger struct {
	*logrus.Logger
	mu            sync.RWMutex
	rotator       *rotatelogs.RotateLogs
	filePath      string
	defaultFields logrus.Fields
}

// LoggerConfig represents the configuration for the logger
type LoggerConfig struct {
	Level      string
	Format     LogFormat
	FilePath   string
	MaxAge     time.Duration
	RotateTime time.Duration
	Fields     map[string]interface{}
}

// DefaultLoggerConfig returns the default logger configuration
func DefaultLoggerConfig() LoggerConfig {
	return LoggerConfig{
		Level:      "info",
		Format:     LogFormatJSON,
		FilePath:   "",
		MaxAge:     7 * 24 * time.Hour, // 7 days
		RotateTime: 24 * time.Hour,     // 1 day
		Fields:     make(map[string]interface{}),
	}
}

// NewEnhancedLogger creates a new logger with the given configuration
func NewEnhancedLogger(config LoggerConfig) (*Logger, error) {
	logger := logrus.New()

	// Set log level
	logLevel, err := logrus.ParseLevel(config.Level)
	if err != nil {
		logLevel = logrus.InfoLevel
	}
	logger.SetLevel(logLevel)

	// Set formatter based on format
	switch config.Format {
	case LogFormatJSON:
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
		})
	case LogFormatText:
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: time.RFC3339,
		})
	default:
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
		})
	}

	// Create a new logger instance
	l := &Logger{
		Logger:        logger,
		defaultFields: logrus.Fields{},
	}

	// Add default fields
	for k, v := range config.Fields {
		l.defaultFields[k] = v
	}

	// Configure file output if specified
	if config.FilePath != "" {
		if err := l.SetOutput(config.FilePath, config.MaxAge, config.RotateTime); err != nil {
			return nil, fmt.Errorf("failed to set log output: %w", err)
		}
	}

	return l, nil
}

// SetOutput sets the output for the logger to a file with rotation
func (l *Logger) SetOutput(filePath string, maxAge, rotateTime time.Duration) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Create directory if it doesn't exist
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	// Configure log rotation
	rotator, err := rotatelogs.New(
		filePath+".%Y%m%d%H%M",
		rotatelogs.WithLinkName(filePath),
		rotatelogs.WithMaxAge(maxAge),
		rotatelogs.WithRotationTime(rotateTime),
	)
	if err != nil {
		return fmt.Errorf("failed to create log rotator: %w", err)
	}

	// Set output to both file and stdout
	l.Logger.SetOutput(io.MultiWriter(os.Stdout, rotator))
	l.rotator = rotator
	l.filePath = filePath

	return nil
}

// SetLevel sets the log level
func (l *Logger) SetLevel(level string) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return fmt.Errorf("invalid log level: %w", err)
	}

	l.Logger.SetLevel(logLevel)
	return nil
}

// WithField adds a field to the logger
func (l *Logger) WithField(key string, value interface{}) *logrus.Entry {
	fields := logrus.Fields{}
	for k, v := range l.defaultFields {
		fields[k] = v
	}
	fields[key] = value
	return l.Logger.WithFields(fields)
}

// WithFields adds multiple fields to the logger
func (l *Logger) WithFields(fields logrus.Fields) *logrus.Entry {
	combinedFields := logrus.Fields{}
	for k, v := range l.defaultFields {
		combinedFields[k] = v
	}
	for k, v := range fields {
		combinedFields[k] = v
	}
	return l.Logger.WithFields(combinedFields)
}

// WithContext adds context values to the logger
func (l *Logger) WithContext(ctx context.Context) *logrus.Entry {
	fields := logrus.Fields{}
	for k, v := range l.defaultFields {
		fields[k] = v
	}

	// Add correlation ID if present
	if correlationID, ok := ctx.Value(CorrelationIDKey).(string); ok {
		fields["correlation_id"] = correlationID
	}

	// Add request ID if present
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		fields["request_id"] = requestID
	}

	// Add user ID if present
	if userID, ok := ctx.Value(UserIDKey).(string); ok {
		fields["user_id"] = userID
	}

	// Add session ID if present
	if sessionID, ok := ctx.Value(SessionIDKey).(string); ok {
		fields["session_id"] = sessionID
	}

	return l.Logger.WithFields(fields)
}

// Close closes the logger and any associated resources
func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.rotator != nil {
		return l.rotator.Close()
	}
	return nil
}

// GenerateCorrelationID generates a new correlation ID
func GenerateCorrelationID() string {
	return uuid.New().String()
}

// ContextWithCorrelationID adds a correlation ID to the context
func ContextWithCorrelationID(ctx context.Context) context.Context {
	return context.WithValue(ctx, CorrelationIDKey, GenerateCorrelationID())
}

// GetCorrelationID gets the correlation ID from the context
func GetCorrelationID(ctx context.Context) string {
	if correlationID, ok := ctx.Value(CorrelationIDKey).(string); ok {
		return correlationID
	}
	return ""
}

// GinLoggerMiddleware returns a gin middleware for logging requests
func GinLoggerMiddleware(logger *Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Start timer
		start := time.Now()

		// Generate correlation ID
		correlationID := GenerateCorrelationID()
		c.Set(string(CorrelationIDKey), correlationID)

		// Add correlation ID to response headers
		c.Header("X-Correlation-ID", correlationID)

		// Create a context with correlation ID
		ctx := context.WithValue(c.Request.Context(), CorrelationIDKey, correlationID)
		c.Request = c.Request.WithContext(ctx)

		// Process request
		c.Next()

		// Calculate request duration
		duration := time.Since(start)

		// Determine log level based on status code
		var logFunc func(args ...interface{})
		statusCode := c.Writer.Status()
		switch {
		case statusCode >= 500:
			logFunc = logger.WithContext(ctx).WithFields(logrus.Fields{
				"client_ip":      c.ClientIP(),
				"method":         c.Request.Method,
				"path":           c.Request.URL.Path,
				"status_code":    statusCode,
				"duration":       duration.String(),
				"duration_ms":    duration.Milliseconds(),
				"correlation_id": correlationID,
				"user_agent":     c.Request.UserAgent(),
				"referer":        c.Request.Referer(),
			}).Error
		case statusCode >= 400:
			logFunc = logger.WithContext(ctx).WithFields(logrus.Fields{
				"client_ip":      c.ClientIP(),
				"method":         c.Request.Method,
				"path":           c.Request.URL.Path,
				"status_code":    statusCode,
				"duration":       duration.String(),
				"duration_ms":    duration.Milliseconds(),
				"correlation_id": correlationID,
				"user_agent":     c.Request.UserAgent(),
				"referer":        c.Request.Referer(),
			}).Warn
		default:
			logFunc = logger.WithContext(ctx).WithFields(logrus.Fields{
				"client_ip":      c.ClientIP(),
				"method":         c.Request.Method,
				"path":           c.Request.URL.Path,
				"status_code":    statusCode,
				"duration":       duration.String(),
				"duration_ms":    duration.Milliseconds(),
				"correlation_id": correlationID,
				"user_agent":     c.Request.UserAgent(),
				"referer":        c.Request.Referer(),
			}).Info
		}

		// Log request
		logFunc("HTTP Request")
	}
}

// GinRecoveryMiddleware returns a gin middleware for recovering from panics
func GinRecoveryMiddleware(logger *Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Get correlation ID from context
				correlationID := c.GetString(string(CorrelationIDKey))
				if correlationID == "" {
					correlationID = GenerateCorrelationID()
					c.Set(string(CorrelationIDKey), correlationID)
				}

				// Create context with correlation ID
				ctx := context.WithValue(c.Request.Context(), CorrelationIDKey, correlationID)

				// Log error
				logger.WithContext(ctx).WithFields(logrus.Fields{
					"client_ip":      c.ClientIP(),
					"method":         c.Request.Method,
					"path":           c.Request.URL.Path,
					"correlation_id": correlationID,
					"error":          err,
				}).Error("Panic recovered")

				// Respond with 500 Internal Server Error
				c.AbortWithStatus(500)
			}
		}()

		c.Next()
	}
}
