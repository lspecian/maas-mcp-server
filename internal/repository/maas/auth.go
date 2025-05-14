package maas

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/sirupsen/logrus"
)

// AuthProvider defines the interface for MAAS authentication providers
type AuthProvider interface {
	// Authenticate adds authentication to an HTTP request
	Authenticate(req *http.Request) error

	// GetCredentials returns the credentials used for authentication
	GetCredentials() string

	// IsValid checks if the authentication credentials are valid
	IsValid() bool
}

// APIKeyAuth implements AuthProvider using API key authentication
type APIKeyAuth struct {
	// APIKey is the MAAS API key in the format <consumer-key>:<token-key>:<token-secret>
	APIKey string

	// ConsumerKey is the OAuth consumer key
	ConsumerKey string

	// TokenKey is the OAuth token key
	TokenKey string

	// TokenSecret is the OAuth token secret
	TokenSecret string

	// Logger is the logger instance
	Logger *logrus.Logger
}

// NewAPIKeyAuth creates a new APIKeyAuth instance
func NewAPIKeyAuth(apiKey string, logger *logrus.Logger) (*APIKeyAuth, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	parts := strings.Split(apiKey, ":")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid API key format, expected <consumer-key>:<token-key>:<token-secret>")
	}

	return &APIKeyAuth{
		APIKey:      apiKey,
		ConsumerKey: parts[0],
		TokenKey:    parts[1],
		TokenSecret: parts[2],
		Logger:      logger,
	}, nil
}

// Authenticate adds OAuth authentication to an HTTP request
func (a *APIKeyAuth) Authenticate(req *http.Request) error {
	// The gomaasclient library handles OAuth authentication internally
	// This method is a placeholder for any additional authentication logic
	return nil
}

// GetCredentials returns the API key
func (a *APIKeyAuth) GetCredentials() string {
	return a.APIKey
}

// IsValid checks if the API key is valid
func (a *APIKeyAuth) IsValid() bool {
	return a.APIKey != "" && a.ConsumerKey != "" && a.TokenKey != "" && a.TokenSecret != ""
}

// CredentialStore defines the interface for storing and retrieving credentials
type CredentialStore interface {
	// StoreCredentials stores credentials for a MAAS instance
	StoreCredentials(instanceName, credentials string) error

	// GetCredentials retrieves credentials for a MAAS instance
	GetCredentials(instanceName string) (string, error)

	// DeleteCredentials deletes credentials for a MAAS instance
	DeleteCredentials(instanceName string) error

	// ListInstances lists all MAAS instances with stored credentials
	ListInstances() ([]string, error)
}

// InMemoryCredentialStore implements CredentialStore using in-memory storage
type InMemoryCredentialStore struct {
	// credentials is a map of instance names to credentials
	credentials map[string]string

	// mu is a mutex to protect concurrent access to credentials
	mu sync.RWMutex
}

// NewInMemoryCredentialStore creates a new InMemoryCredentialStore instance
func NewInMemoryCredentialStore() *InMemoryCredentialStore {
	return &InMemoryCredentialStore{
		credentials: make(map[string]string),
	}
}

// StoreCredentials stores credentials for a MAAS instance
func (s *InMemoryCredentialStore) StoreCredentials(instanceName, credentials string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.credentials[instanceName] = credentials
	return nil
}

// GetCredentials retrieves credentials for a MAAS instance
func (s *InMemoryCredentialStore) GetCredentials(instanceName string) (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	credentials, ok := s.credentials[instanceName]
	if !ok {
		return "", fmt.Errorf("no credentials found for MAAS instance '%s'", instanceName)
	}

	return credentials, nil
}

// DeleteCredentials deletes credentials for a MAAS instance
func (s *InMemoryCredentialStore) DeleteCredentials(instanceName string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.credentials[instanceName]; !ok {
		return fmt.Errorf("no credentials found for MAAS instance '%s'", instanceName)
	}

	delete(s.credentials, instanceName)
	return nil
}

// ListInstances lists all MAAS instances with stored credentials
func (s *InMemoryCredentialStore) ListInstances() ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	instances := make([]string, 0, len(s.credentials))
	for instance := range s.credentials {
		instances = append(instances, instance)
	}

	return instances, nil
}

// AuthManager manages authentication for multiple MAAS instances
type AuthManager struct {
	// Store is the credential store
	Store CredentialStore

	// Providers is a map of instance names to auth providers
	Providers map[string]AuthProvider

	// Logger is the logger instance
	Logger *logrus.Logger

	// mu is a mutex to protect concurrent access to providers
	mu sync.RWMutex
}

// NewAuthManager creates a new AuthManager instance
func NewAuthManager(store CredentialStore, logger *logrus.Logger) *AuthManager {
	if store == nil {
		store = NewInMemoryCredentialStore()
	}

	return &AuthManager{
		Store:     store,
		Providers: make(map[string]AuthProvider),
		Logger:    logger,
	}
}

// RegisterProvider registers an auth provider for a MAAS instance
func (m *AuthManager) RegisterProvider(instanceName string, provider AuthProvider) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !provider.IsValid() {
		return fmt.Errorf("invalid auth provider for MAAS instance '%s'", instanceName)
	}

	m.Providers[instanceName] = provider

	// Store the credentials
	return m.Store.StoreCredentials(instanceName, provider.GetCredentials())
}

// GetProvider returns the auth provider for a MAAS instance
func (m *AuthManager) GetProvider(instanceName string) (AuthProvider, error) {
	m.mu.RLock()
	provider, ok := m.Providers[instanceName]
	m.mu.RUnlock()

	if ok {
		return provider, nil
	}

	// Try to load the provider from the store
	credentials, err := m.Store.GetCredentials(instanceName)
	if err != nil {
		return nil, fmt.Errorf("no auth provider found for MAAS instance '%s': %w", instanceName, err)
	}

	// Create a new provider
	provider, err = NewAPIKeyAuth(credentials, m.Logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth provider for MAAS instance '%s': %w", instanceName, err)
	}

	// Register the provider
	m.mu.Lock()
	m.Providers[instanceName] = provider
	m.mu.Unlock()

	return provider, nil
}

// RemoveProvider removes an auth provider for a MAAS instance
func (m *AuthManager) RemoveProvider(instanceName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.Providers[instanceName]; !ok {
		return fmt.Errorf("no auth provider found for MAAS instance '%s'", instanceName)
	}

	delete(m.Providers, instanceName)

	// Remove the credentials from the store
	return m.Store.DeleteCredentials(instanceName)
}

// ListInstances lists all MAAS instances with registered auth providers
func (m *AuthManager) ListInstances() ([]string, error) {
	return m.Store.ListInstances()
}

// GenerateAPIKey generates a random API key for testing purposes
func GenerateAPIKey() (string, error) {
	// Generate random bytes for each part of the API key
	consumerKey := make([]byte, 16)
	tokenKey := make([]byte, 16)
	tokenSecret := make([]byte, 32)

	if _, err := rand.Read(consumerKey); err != nil {
		return "", fmt.Errorf("failed to generate consumer key: %w", err)
	}

	if _, err := rand.Read(tokenKey); err != nil {
		return "", fmt.Errorf("failed to generate token key: %w", err)
	}

	if _, err := rand.Read(tokenSecret); err != nil {
		return "", fmt.Errorf("failed to generate token secret: %w", err)
	}

	// Encode the random bytes as base64
	consumerKeyStr := base64.URLEncoding.EncodeToString(consumerKey)
	tokenKeyStr := base64.URLEncoding.EncodeToString(tokenKey)
	tokenSecretStr := base64.URLEncoding.EncodeToString(tokenSecret)

	// Format the API key
	apiKey := fmt.Sprintf("%s:%s:%s", consumerKeyStr, tokenKeyStr, tokenSecretStr)

	return apiKey, nil
}
