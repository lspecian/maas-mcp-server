package logging

import (
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// NewLogger creates a new logger with the given log level
// This function maintains backward compatibility with the old API
func NewLogger(level string) *logrus.Logger {
	config := DefaultLoggerConfig()
	config.Level = level

	logger, err := NewEnhancedLogger(config)
	if err != nil {
		// Fallback to basic logger if there's an error
		basicLogger := logrus.New()
		logLevel, parseErr := logrus.ParseLevel(level)
		if parseErr != nil {
			logLevel = logrus.InfoLevel
		}
		basicLogger.SetLevel(logLevel)
		basicLogger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05Z07:00",
		})
		return basicLogger
	}

	return logger.Logger
}

// GinLoggerMiddlewareCompat returns a gin middleware for logging requests
// This function maintains backward compatibility with the old API
func GinLoggerMiddlewareCompat(logger *logrus.Logger) gin.HandlerFunc {
	// Create a wrapper logger
	wrapperLogger := &Logger{
		Logger:        logger,
		defaultFields: logrus.Fields{},
	}

	return GinLoggerMiddleware(wrapperLogger)
}
