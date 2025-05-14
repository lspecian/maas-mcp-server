package unit

import (
	"testing"

	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

// TestConfig returns a test configuration
func TestConfig() *models.AppConfig {
	return &models.AppConfig{
		Server: models.ServerConfig{
			Host: "localhost",
			Port: 8080,
		},
		MAASInstances: map[string]models.MAASInstanceConfig{
			"default": {
				APIURL: "http://localhost:5240/MAAS/api/2.0",
				APIKey: "test:test:test",
			},
		},
		Auth: models.AuthConfig{
			Enabled: false,
			RateLimit: models.RateLimitConfig{
				Enabled:     true,
				MaxAttempts: 5,
				Window:      300,
			},
		},
		Logging: models.LoggingConfig{
			Level: "error",
		},
	}
}

// TestLogger returns a test logger
func TestLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	return logger
}

// TestLoggerWithLevel returns a test logger with a specific log level
func TestLoggerWithLevel(level logrus.Level) *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(level)
	return logger
}

// SetupTest sets up a test environment
func SetupTest(t *testing.T) (*models.AppConfig, *logrus.Logger) {
	cfg := TestConfig()
	logger := TestLogger()
	return cfg, logger
}

// SetupTestWithLogLevel sets up a test environment with a specific log level
func SetupTestWithLogLevel(t *testing.T, level logrus.Level) (*models.AppConfig, *logrus.Logger) {
	cfg := TestConfig()
	logger := TestLoggerWithLevel(level)
	return cfg, logger
}

// RequireNoError is a helper function to require that an error is nil
func RequireNoError(t *testing.T, err error, msgAndArgs ...interface{}) {
	require.NoError(t, err, msgAndArgs...)
}

// RequireError is a helper function to require that an error is not nil
func RequireError(t *testing.T, err error, msgAndArgs ...interface{}) {
	require.Error(t, err, msgAndArgs...)
}

// RequireEqual is a helper function to require that two values are equal
func RequireEqual(t *testing.T, expected, actual interface{}, msgAndArgs ...interface{}) {
	require.Equal(t, expected, actual, msgAndArgs...)
}

// RequireNotEqual is a helper function to require that two values are not equal
func RequireNotEqual(t *testing.T, expected, actual interface{}, msgAndArgs ...interface{}) {
	require.NotEqual(t, expected, actual, msgAndArgs...)
}

// RequireNil is a helper function to require that a value is nil
func RequireNil(t *testing.T, object interface{}, msgAndArgs ...interface{}) {
	require.Nil(t, object, msgAndArgs...)
}

// RequireNotNil is a helper function to require that a value is not nil
func RequireNotNil(t *testing.T, object interface{}, msgAndArgs ...interface{}) {
	require.NotNil(t, object, msgAndArgs...)
}

// RequireTrue is a helper function to require that a condition is true
func RequireTrue(t *testing.T, condition bool, msgAndArgs ...interface{}) {
	require.True(t, condition, msgAndArgs...)
}

// RequireFalse is a helper function to require that a condition is false
func RequireFalse(t *testing.T, condition bool, msgAndArgs ...interface{}) {
	require.False(t, condition, msgAndArgs...)
}

// RequireContains is a helper function to require that a string/array/map contains a value
func RequireContains(t *testing.T, haystack, needle interface{}, msgAndArgs ...interface{}) {
	require.Contains(t, haystack, needle, msgAndArgs...)
}

// RequireNotContains is a helper function to require that a string/array/map does not contain a value
func RequireNotContains(t *testing.T, haystack, needle interface{}, msgAndArgs ...interface{}) {
	require.NotContains(t, haystack, needle, msgAndArgs...)
}

// RequireLen is a helper function to require that a collection has a specific length
func RequireLen(t *testing.T, object interface{}, length int, msgAndArgs ...interface{}) {
	require.Len(t, object, length, msgAndArgs...)
}

// RequireEmpty is a helper function to require that a collection is empty
func RequireEmpty(t *testing.T, object interface{}, msgAndArgs ...interface{}) {
	require.Empty(t, object, msgAndArgs...)
}

// RequireNotEmpty is a helper function to require that a collection is not empty
func RequireNotEmpty(t *testing.T, object interface{}, msgAndArgs ...interface{}) {
	require.NotEmpty(t, object, msgAndArgs...)
}
