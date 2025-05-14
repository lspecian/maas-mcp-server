package logging

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestNewEnhancedLogger(t *testing.T) {
	// Create a temporary directory for log files
	tempDir, err := os.MkdirTemp("", "logger-test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Test cases
	testCases := []struct {
		name   string
		config LoggerConfig
	}{
		{
			name: "JSON format",
			config: LoggerConfig{
				Level:      "info",
				Format:     LogFormatJSON,
				FilePath:   filepath.Join(tempDir, "test.log"),
				MaxAge:     24 * time.Hour,
				RotateTime: time.Hour,
				Fields: map[string]interface{}{
					"service": "test",
				},
			},
		},
		{
			name: "Text format",
			config: LoggerConfig{
				Level:      "debug",
				Format:     LogFormatText,
				FilePath:   filepath.Join(tempDir, "test.log"),
				MaxAge:     24 * time.Hour,
				RotateTime: time.Hour,
				Fields: map[string]interface{}{
					"service": "test",
				},
			},
		},
		{
			name: "No file path",
			config: LoggerConfig{
				Level:  "info",
				Format: LogFormatJSON,
				Fields: map[string]interface{}{
					"service": "test",
				},
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			logger, err := NewEnhancedLogger(tc.config)
			assert.NoError(t, err)
			assert.NotNil(t, logger)

			// Test logging
			logger.Info("Test message")

			// Test with fields
			logger.WithField("key", "value").Info("Test message with field")

			// Test with context
			ctx := context.WithValue(context.Background(), CorrelationIDKey, "test-correlation-id")
			logger.WithContext(ctx).Info("Test message with context")

			// Close logger
			err = logger.Close()
			assert.NoError(t, err)

			// Check if log file exists if FilePath is set
			if tc.config.FilePath != "" {
				_, err := os.Stat(tc.config.FilePath)
				assert.NoError(t, err)
			}
		})
	}
}

func TestLoggerWithOutput(t *testing.T) {
	// Create a buffer to capture log output
	var buf bytes.Buffer

	// Create logger with custom output
	logger := logrus.New()
	logger.SetOutput(&buf)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Create enhanced logger
	enhancedLogger := &Logger{
		Logger: logger,
	}

	// Log a message
	enhancedLogger.Info("Test message")

	// Parse the log entry
	var entry map[string]interface{}
	err := json.Unmarshal(buf.Bytes(), &entry)
	assert.NoError(t, err)

	// Check log entry fields
	assert.Equal(t, "Test message", entry["msg"])
	assert.Equal(t, "info", entry["level"])
}

func TestGinLoggerMiddleware(t *testing.T) {
	// Create a buffer to capture log output
	var buf bytes.Buffer

	// Create logger with custom output
	logger := logrus.New()
	logger.SetOutput(&buf)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Create enhanced logger
	enhancedLogger := &Logger{
		Logger: logger,
	}

	// Create a gin router with the middleware
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(GinLoggerMiddleware(enhancedLogger))

	// Add a test handler
	router.GET("/test", func(c *gin.Context) {
		c.String(http.StatusOK, "OK")
	})

	// Create a test request
	req := httptest.NewRequest("GET", "/test", nil)
	resp := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(resp, req)

	// Check response
	assert.Equal(t, http.StatusOK, resp.Code)
	assert.Equal(t, "OK", resp.Body.String())

	// Parse the log entry
	var entry map[string]interface{}
	err := json.Unmarshal(buf.Bytes(), &entry)
	assert.NoError(t, err)

	// Check log entry fields
	assert.Equal(t, "HTTP Request", entry["msg"])
	assert.Equal(t, "info", entry["level"])
	assert.Equal(t, "/test", entry["path"])
	assert.Equal(t, "GET", entry["method"])
	assert.Equal(t, float64(200), entry["status_code"])
	assert.NotEmpty(t, entry["correlation_id"])
}

func TestGinRecoveryMiddleware(t *testing.T) {
	// Create a buffer to capture log output
	var buf bytes.Buffer

	// Create logger with custom output
	logger := logrus.New()
	logger.SetOutput(&buf)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Create enhanced logger
	enhancedLogger := &Logger{
		Logger: logger,
	}

	// Create a gin router with the middleware
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(GinRecoveryMiddleware(enhancedLogger))

	// Add a test handler that panics
	router.GET("/panic", func(c *gin.Context) {
		panic("test panic")
	})

	// Create a test request
	req := httptest.NewRequest("GET", "/panic", nil)
	resp := httptest.NewRecorder()

	// Serve the request
	router.ServeHTTP(resp, req)

	// Check response
	assert.Equal(t, http.StatusInternalServerError, resp.Code)

	// Parse the log entry
	var entry map[string]interface{}
	err := json.Unmarshal(buf.Bytes(), &entry)
	assert.NoError(t, err)

	// Check log entry fields
	assert.Equal(t, "Panic recovered", entry["msg"])
	assert.Equal(t, "error", entry["level"])
	assert.Equal(t, "/panic", entry["path"])
	assert.Equal(t, "GET", entry["method"])
	assert.Equal(t, "test panic", entry["error"])
	assert.NotEmpty(t, entry["correlation_id"])
}

func TestCorrelationID(t *testing.T) {
	// Test generating correlation ID
	correlationID := GenerateCorrelationID()
	assert.NotEmpty(t, correlationID)

	// Test adding correlation ID to context
	ctx := context.Background()
	ctx = ContextWithCorrelationID(ctx)
	retrievedID := GetCorrelationID(ctx)
	assert.NotEmpty(t, retrievedID)

	// Test getting correlation ID from context
	ctx = context.WithValue(context.Background(), CorrelationIDKey, "test-correlation-id")
	retrievedID = GetCorrelationID(ctx)
	assert.Equal(t, "test-correlation-id", retrievedID)
}

func TestLoggerSetLevel(t *testing.T) {
	// Create logger
	logger, err := NewEnhancedLogger(DefaultLoggerConfig())
	assert.NoError(t, err)

	// Test setting valid log level
	err = logger.SetLevel("debug")
	assert.NoError(t, err)
	assert.Equal(t, logrus.DebugLevel, logger.Logger.GetLevel())

	// Test setting invalid log level
	err = logger.SetLevel("invalid")
	assert.Error(t, err)
}
