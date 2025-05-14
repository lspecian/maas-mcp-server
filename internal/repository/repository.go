package repository

import (
	"context"
)

// Repository is the base interface for all repositories
type Repository interface {
	// Close closes the repository and releases any resources
	Close() error
}

// Transaction represents a database transaction
type Transaction interface {
	// Commit commits the transaction
	Commit() error
	// Rollback aborts the transaction
	Rollback() error
}

// TransactionManager manages database transactions
type TransactionManager interface {
	// BeginTx starts a new transaction
	BeginTx(ctx context.Context) (Transaction, error)
}
