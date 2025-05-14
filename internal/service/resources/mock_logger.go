package resources

import (
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/sirupsen/logrus"
)

// MockLogger is a simple logger for testing that implements the same interface as logging.Logger
type MockLogger struct {
	*logrus.Logger
}

// NewMockLogger creates a new mock logger
func NewMockLogger() *logging.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)

	// Create a wrapper logger that matches the logging.Logger interface
	return &logging.Logger{
		Logger: logger,
	}
}

// For testing purposes, we'll use the logging package directly
// This avoids having to reimplement all the methods of the logging.Logger interface
