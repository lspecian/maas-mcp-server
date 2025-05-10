package integration

import (
	"os"
	"testing"

	"github.com/sirupsen/logrus"
)

var logger *logrus.Logger

// TestMain is the entry point for running all integration tests.
func TestMain(m *testing.M) {
	// Set up logger
	logger = logrus.New()
	logger.SetLevel(logrus.ErrorLevel)

	// Run tests
	exitCode := m.Run()

	// Exit with the same code
	os.Exit(exitCode)
}
