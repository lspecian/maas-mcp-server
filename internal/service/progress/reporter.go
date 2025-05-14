package progress

import (
	"time"

	"github.com/lspecian/maas-mcp-server/internal/transport/mcp/events"
)

// ProgressReporter is an interface that long-running operations can use to report their progress.
// It provides methods for reporting progress, completion, errors, and log messages.
type ProgressReporter interface {
	// ReportProgress reports the current progress of an operation.
	// progress is a value between 0 and 100 representing the percentage of completion.
	// message is an optional human-readable message about the progress.
	// details is an optional object containing additional details about the progress.
	ReportProgress(progress float64, message string, details interface{}) error

	// ReportCompletion reports the successful completion of an operation.
	// result is an optional object containing the result of the operation.
	// message is an optional human-readable message about the completion.
	ReportCompletion(result interface{}, message string) error

	// ReportError reports an error that occurred during an operation.
	// err is the error message.
	// code is an optional error code.
	// details is an optional object containing additional details about the error.
	// recoverable indicates whether the error is recoverable.
	ReportError(err string, code int, details interface{}, recoverable bool) error

	// ReportLog reports a log message from an operation.
	// level is the log level (debug, info, warning, error).
	// message is the log message.
	// source is an optional source of the log message.
	// details is an optional object containing additional details about the log.
	ReportLog(level events.LogLevel, message string, source string, details interface{}) error

	// ReportStatus reports a status change for an operation.
	// previousStatus is the previous status of the operation.
	// currentStatus is the current status of the operation.
	// message is an optional human-readable message about the status change.
	// details is an optional object containing additional details about the status change.
	ReportStatus(previousStatus, currentStatus events.StatusType, message string, details interface{}) error

	// OperationID returns the ID of the operation this reporter is associated with.
	OperationID() string

	// StartTime returns the time the operation started.
	StartTime() time.Time
}

// ProgressReporterFunc is a function type that creates a new ProgressReporter for a given operation.
type ProgressReporterFunc func(operationID string) ProgressReporter
