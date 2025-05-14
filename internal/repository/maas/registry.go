package maas

import (
	"fmt"
	"sync"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// ClientRegistry manages multiple MAAS clients
type clientRegistry struct {
	// clients is a map of instance names to clients
	clients map[string]Client

	// defaultInstance is the name of the default instance
	defaultInstance string

	// config is the registry configuration
	config *maas.RegistryConfig

	// logger is the logger instance
	logger *logrus.Logger

	// mu is a mutex to protect concurrent access to the registry
	mu sync.RWMutex
}

// NewClientRegistry creates a new ClientRegistry instance
func NewClientRegistry(config *maas.RegistryConfig, logger *logrus.Logger) (ClientRegistry, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid registry configuration: %w", err)
	}

	registry := &clientRegistry{
		clients:         make(map[string]Client),
		defaultInstance: config.DefaultInstance,
		config:          config,
		logger:          logger,
	}

	// Initialize clients for each instance in the configuration
	for name, clientConfig := range config.Instances {
		client, err := NewMAASClient(clientConfig, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize client for instance '%s': %w", name, err)
		}

		registry.clients[name] = client
	}

	return registry, nil
}

// GetClient returns the client for a specific MAAS instance
func (r *clientRegistry) GetClient(instanceName string) (Client, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	client, ok := r.clients[instanceName]
	if !ok {
		return nil, fmt.Errorf("no client found for MAAS instance '%s'", instanceName)
	}

	return client, nil
}

// GetDefaultClient returns the client for the default MAAS instance
func (r *clientRegistry) GetDefaultClient() (Client, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	client, ok := r.clients[r.defaultInstance]
	if !ok {
		return nil, fmt.Errorf("no client found for default MAAS instance '%s'", r.defaultInstance)
	}

	return client, nil
}

// RegisterClient registers a client for a MAAS instance
func (r *clientRegistry) RegisterClient(instanceName string, client Client) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.clients[instanceName]; ok {
		return fmt.Errorf("client already registered for MAAS instance '%s'", instanceName)
	}

	r.clients[instanceName] = client

	// If this is the first client, set it as the default
	if len(r.clients) == 1 {
		r.defaultInstance = instanceName
	}

	return nil
}

// RemoveClient removes a client for a MAAS instance
func (r *clientRegistry) RemoveClient(instanceName string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.clients[instanceName]; !ok {
		return fmt.Errorf("no client found for MAAS instance '%s'", instanceName)
	}

	// Cannot remove the default instance
	if instanceName == r.defaultInstance {
		return fmt.Errorf("cannot remove the default MAAS instance '%s'", instanceName)
	}

	// Close the client before removing it
	if err := r.clients[instanceName].Close(); err != nil {
		r.logger.WithError(err).WithField("instance", instanceName).Warn("Failed to close client")
	}

	delete(r.clients, instanceName)

	return nil
}

// ListInstances lists all registered MAAS instances
func (r *clientRegistry) ListInstances() ([]string, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	instances := make([]string, 0, len(r.clients))
	for instance := range r.clients {
		instances = append(instances, instance)
	}

	return instances, nil
}

// SetDefaultInstance sets the default MAAS instance
func (r *clientRegistry) SetDefaultInstance(instanceName string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.clients[instanceName]; !ok {
		return fmt.Errorf("no client found for MAAS instance '%s'", instanceName)
	}

	r.defaultInstance = instanceName

	return nil
}

// Close closes all clients and releases any resources
func (r *clientRegistry) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()

	var errs []error

	for instance, client := range r.clients {
		if err := client.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close client for instance '%s': %w", instance, err))
		}
	}

	// Clear the clients map
	r.clients = make(map[string]Client)

	if len(errs) > 0 {
		return fmt.Errorf("failed to close one or more clients: %v", errs)
	}

	return nil
}
