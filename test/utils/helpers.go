package utils

import (
	"context"
	"io/ioutil"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

// WithTempDir creates a temporary directory for testing and cleans it up afterward
func WithTempDir(t *testing.T, fn func(dir string)) {
	dir, err := ioutil.TempDir("", "maas-mcp-test-")
	require.NoError(t, err, "Failed to create temp dir")
	defer os.RemoveAll(dir)
	fn(dir)
}

// WithTempFile creates a temporary file for testing and cleans it up afterward
func WithTempFile(t *testing.T, content string) (string, func()) {
	file, err := ioutil.TempFile("", "maas-mcp-test-*.txt")
	require.NoError(t, err, "Failed to create temp file")

	_, err = file.WriteString(content)
	require.NoError(t, err, "Failed to write to temp file")

	err = file.Close()
	require.NoError(t, err, "Failed to close temp file")

	return file.Name(), func() {
		os.Remove(file.Name())
	}
}

// WithTestContext creates a test context with timeout
func WithTestContext(t *testing.T) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// CreateTestLogger creates a logger for testing
func CreateTestLogger() *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(logrus.ErrorLevel)
	return logger
}

// CreateTestLoggerWithLevel creates a logger for testing with a specific log level
func CreateTestLoggerWithLevel(level logrus.Level) *logrus.Logger {
	logger := logrus.New()
	logger.SetLevel(level)
	return logger
}

// CreateTestFile creates a file with the given content in the specified directory
func CreateTestFile(t *testing.T, dir, name, content string) string {
	path := filepath.Join(dir, name)
	err := ioutil.WriteFile(path, []byte(content), 0644)
	require.NoError(t, err, "Failed to create test file")
	return path
}

// ReadTestFile reads the content of a file
func ReadTestFile(t *testing.T, path string) string {
	content, err := ioutil.ReadFile(path)
	require.NoError(t, err, "Failed to read test file")
	return string(content)
}

// AssertFileExists asserts that a file exists
func AssertFileExists(t *testing.T, path string) {
	_, err := os.Stat(path)
	require.NoError(t, err, "File should exist: %s", path)
}

// AssertFileNotExists asserts that a file does not exist
func AssertFileNotExists(t *testing.T, path string) {
	_, err := os.Stat(path)
	require.True(t, os.IsNotExist(err), "File should not exist: %s", path)
}

// AssertDirExists asserts that a directory exists
func AssertDirExists(t *testing.T, path string) {
	info, err := os.Stat(path)
	require.NoError(t, err, "Directory should exist: %s", path)
	require.True(t, info.IsDir(), "Path should be a directory: %s", path)
}

// AssertDirNotExists asserts that a directory does not exist
func AssertDirNotExists(t *testing.T, path string) {
	_, err := os.Stat(path)
	require.True(t, os.IsNotExist(err), "Directory should not exist: %s", path)
}

// WithEnvVar sets an environment variable for the duration of the test
func WithEnvVar(t *testing.T, key, value string, fn func()) {
	oldValue, wasSet := os.LookupEnv(key)
	err := os.Setenv(key, value)
	require.NoError(t, err, "Failed to set environment variable")

	defer func() {
		if wasSet {
			os.Setenv(key, oldValue)
		} else {
			os.Unsetenv(key)
		}
	}()

	fn()
}

// WithWorkDir changes the working directory for the duration of the test
func WithWorkDir(t *testing.T, dir string, fn func()) {
	oldDir, err := os.Getwd()
	require.NoError(t, err, "Failed to get current working directory")

	err = os.Chdir(dir)
	require.NoError(t, err, "Failed to change working directory")

	defer func() {
		err := os.Chdir(oldDir)
		require.NoError(t, err, "Failed to restore working directory")
	}()

	fn()
}

// RetryUntil retries a function until it returns true or the timeout is reached
func RetryUntil(t *testing.T, fn func() bool, timeout, interval time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if fn() {
			return true
		}
		time.Sleep(interval)
	}
	return false
}

// WaitForCondition waits for a condition to be true or the timeout to be reached
func WaitForCondition(t *testing.T, condition func() bool, timeout, interval time.Duration, message string) {
	success := RetryUntil(t, condition, timeout, interval)
	require.True(t, success, "Timed out waiting for condition: %s", message)
}
