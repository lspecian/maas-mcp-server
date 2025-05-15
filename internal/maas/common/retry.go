package common

import (
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
)

// RetryFunc defines a function that retries an operation
type RetryFunc func(operation func() error, attempts int, delay time.Duration) error

// CreateRetryFunc creates a retry function with the given logger
func CreateRetryFunc(logger *logrus.Logger) RetryFunc {
	return func(operation func() error, attempts int, delay time.Duration) error {
		for i := 0; i < attempts; i++ {
			err := operation()
			if err == nil {
				return nil
			}
			logger.Warnf("Attempt %d failed: %v", i+1, err)
			time.Sleep(delay)
		}
		return fmt.Errorf("failed after %d attempts", attempts)
	}
}
