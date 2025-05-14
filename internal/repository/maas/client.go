package maas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	gomaasclient "github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MAASClient implements the Client interface for interacting with the MAAS API
type MAASClient struct {
	// client is the underlying gomaasclient
	client *gomaasclient.Client

	// config is the client configuration
	config *maas.ClientConfig

	// logger is the logger instance
	logger *logrus.Logger

	// authProvider is the authentication provider
	authProvider AuthProvider

	// httpClient is the HTTP client used for API requests
	httpClient *http.Client

	// mu is a mutex to protect concurrent access to the client
	mu sync.RWMutex

	// closed indicates if the client has been closed
	closed bool
}

// NewMAASClient creates a new MAASClient instance
func NewMAASClient(config *maas.ClientConfig, logger *logrus.Logger) (*MAASClient, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid client configuration: %w", err)
	}

	// Create the auth provider
	authProvider, err := NewAPIKeyAuth(config.APIKey, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth provider: %w", err)
	}

	// Create the HTTP client with timeout
	httpClient := &http.Client{
		Timeout: config.RequestTimeout,
	}

	// Initialize the gomaasclient
	client, err := gomaasclient.GetClient(config.APIURL, config.APIKey, config.APIVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize MAAS client: %w", err)
	}

	return &MAASClient{
		client:       client,
		config:       config,
		logger:       logger,
		authProvider: authProvider,
		httpClient:   httpClient,
		closed:       false,
	}, nil
}

// GetVersion returns the MAAS API version
func (c *MAASClient) GetVersion(ctx context.Context) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return "", fmt.Errorf("client is closed")
	}

	// The API version is stored in the config
	return c.config.APIVersion, nil
}

// Close closes the client and releases any resources
func (c *MAASClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return nil
	}

	c.closed = true

	// Close the HTTP client if it implements io.Closer
	if closer, ok := interface{}(c.httpClient).(interface{ Close() error }); ok {
		if err := closer.Close(); err != nil {
			c.logger.WithError(err).Warn("Failed to close HTTP client")
		}
	}

	return nil
}

// newRequest creates a new HTTP request with the given method, endpoint, and body
func (c *MAASClient) newRequest(ctx context.Context, method, endpoint string, body interface{}) (*http.Request, error) {
	// Construct the full URL
	url := c.config.APIURL + endpoint

	var req *http.Request
	var err error

	if body != nil {
		// Marshal the body to JSON
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}

		// Create the request with the JSON body
		req, err = http.NewRequestWithContext(ctx, method, url, bytes.NewBuffer(jsonBody))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		// Set the content type header
		req.Header.Set("Content-Type", "application/json")
	} else {
		// Create the request without a body
		req, err = http.NewRequestWithContext(ctx, method, url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}
	}

	// Set the authorization header
	if c.authProvider != nil {
		if err := c.authProvider.Authenticate(req); err != nil {
			return nil, fmt.Errorf("failed to authenticate request: %w", err)
		}
	}

	// Set the accept header
	req.Header.Set("Accept", "application/json")

	return req, nil
}

// retry is a helper function that retries operations with exponential backoff
func (c *MAASClient) retry(ctx context.Context, operation func() error) error {
	var err error
	delay := c.config.RetryDelay

	for attempt := 1; attempt <= c.config.MaxRetries; attempt++ {
		// Check if the context is canceled
		select {
		case <-ctx.Done():
			return fmt.Errorf("operation canceled: %w", ctx.Err())
		default:
			// Continue with the operation
		}

		err = operation()
		if err == nil {
			return nil
		}

		// Check if the error is retryable
		if !IsRetryable(err) {
			return err
		}

		if attempt == c.config.MaxRetries {
			break
		}

		c.logger.WithFields(logrus.Fields{
			"attempt":      attempt,
			"max_attempts": c.config.MaxRetries,
			"delay":        delay.String(),
			"error":        err.Error(),
		}).Warn("Operation failed, retrying...")

		// Wait with exponential backoff
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return fmt.Errorf("operation canceled during retry: %w", ctx.Err())
		case <-timer.C:
			// Continue with the next attempt
		}

		delay = time.Duration(float64(delay) * c.config.RetryBackoffFactor)
	}

	return fmt.Errorf("operation failed after %d attempts: %w", c.config.MaxRetries, err)
}

// ==================== Machine Operations ====================

// ListMachines retrieves machines based on filters with pagination
func (c *MAASClient) ListMachines(ctx context.Context, filters map[string]string, pagination *maas.PaginationOptions) ([]maas.Machine, int, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, 0, fmt.Errorf("client is closed")
	}

	params := &entity.MachinesParams{}

	// Apply filters to params if provided
	if hostname, ok := filters["hostname"]; ok {
		params.Hostname = []string{hostname}
	}
	if zone, ok := filters["zone"]; ok {
		params.Zone = []string{zone}
	}
	if pool, ok := filters["pool"]; ok {
		params.Pool = []string{pool}
	}
	if tags, ok := filters["tags"]; ok {
		params.Tags = strings.Split(tags, ",")
	}

	// Note: Some filters might not be directly supported by the MAAS API
	// We'll apply these filters after getting the results
	// For now, we'll collect them for logging purposes
	unsupportedFilters := make(map[string]string)
	if status, ok := filters["status"]; ok {
		unsupportedFilters["status"] = status
	}
	if architecture, ok := filters["architecture"]; ok {
		unsupportedFilters["architecture"] = architecture
	}
	if systemID, ok := filters["system_id"]; ok {
		unsupportedFilters["system_id"] = systemID
	}

	// Note: MAAS API might not support pagination directly
	// We'll implement pagination in memory after getting all results

	var entityMachines []entity.Machine
	var totalCount int
	operation := func() error {
		var err error
		c.logger.WithFields(logrus.Fields{
			"filters":            filters,
			"unsupportedFilters": unsupportedFilters,
			"pagination":         pagination,
		}).Debug("Listing MAAS machines")

		entityMachines, err = c.client.Machines.Get(params)
		if err != nil {
			c.logger.WithError(err).Error("Failed to list MAAS machines")
			return TranslateError(err, http.StatusInternalServerError)
		}

		// Get total count for pagination
		// Note: In a real implementation, this would come from the MAAS API response
		// For now, we'll use the length of the returned machines as an approximation
		totalCount = len(entityMachines)

		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, 0, err
	}

	// Convert entity.Machine to maas.Machine
	machines := make([]maas.Machine, len(entityMachines))
	for i, entityMachine := range entityMachines {
		var machine maas.Machine
		machine.FromEntity(&entityMachine)
		machines[i] = machine
	}

	// Apply in-memory filtering for unsupported filters
	if len(unsupportedFilters) > 0 {
		filteredMachines := []maas.Machine{}
		for _, machine := range machines {
			include := true

			// Filter by status if specified
			if status, ok := unsupportedFilters["status"]; ok && status != "" {
				if machine.Status != status {
					include = false
				}
			}

			// Filter by architecture if specified
			if architecture, ok := unsupportedFilters["architecture"]; ok && architecture != "" {
				if machine.Architecture != architecture {
					include = false
				}
			}

			// Filter by system ID if specified
			if systemID, ok := unsupportedFilters["system_id"]; ok && systemID != "" {
				if machine.SystemID != systemID {
					include = false
				}
			}

			if include {
				filteredMachines = append(filteredMachines, machine)
			}
		}

		// Update machines and total count
		machines = filteredMachines
		totalCount = len(filteredMachines)
	}

	// Apply in-memory pagination if specified
	if pagination != nil {
		startIndex := pagination.Offset
		endIndex := startIndex + pagination.Limit

		if startIndex >= len(machines) {
			// Return empty result if offset is beyond the available machines
			return []maas.Machine{}, totalCount, nil
		}

		if endIndex > len(machines) {
			endIndex = len(machines)
		}

		machines = machines[startIndex:endIndex]
	}

	return machines, totalCount, nil
}

// GetMachine retrieves details for a specific machine
func (c *MAASClient) GetMachine(ctx context.Context, systemID string) (*maas.Machine, error) {
	return c.GetMachineWithDetails(ctx, systemID, true)
}

// GetMachineWithDetails retrieves details for a specific machine with optional detailed information
func (c *MAASClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithField("system_id", systemID).Debug("Getting MAAS machine")
		entityMachine, err = c.client.Machine.Get(systemID)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	// Get interfaces and block devices for the machine if requested
	if includeDetails {
		if err := c.populateMachineDetails(ctx, machine); err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Warn("Failed to populate machine details")
			// Continue with partial data
		}
	}

	return machine, nil
}

// populateMachineDetails fetches additional details for a machine
func (c *MAASClient) populateMachineDetails(ctx context.Context, machine *maas.Machine) error {
	// Get network interfaces
	interfaces, err := c.GetMachineInterfaces(ctx, machine.SystemID)
	if err != nil {
		return fmt.Errorf("failed to get machine interfaces: %w", err)
	}
	machine.Interfaces = interfaces

	// Get block devices
	blockDevices, err := c.GetMachineBlockDevices(ctx, machine.SystemID)
	if err != nil {
		return fmt.Errorf("failed to get machine block devices: %w", err)
	}
	machine.BlockDevices = blockDevices

	return nil
}

// AllocateMachine allocates a machine based on constraints
func (c *MAASClient) AllocateMachine(ctx context.Context, params *entity.MachineAllocateParams) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithField("params", fmt.Sprintf("%+v", params)).Debug("Allocating MAAS machine")
		entityMachine, err = c.client.Machines.Allocate(params)
		if err != nil {
			c.logger.WithError(err).Error("Failed to allocate MAAS machine")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// DeployMachine deploys an allocated machine
func (c *MAASClient) DeployMachine(ctx context.Context, systemID string, params *entity.MachineDeployParams) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithFields(logrus.Fields{
			"system_id": systemID,
			"params":    fmt.Sprintf("%+v", params),
		}).Debug("Deploying MAAS machine")
		entityMachine, err = c.client.Machine.Deploy(systemID, params)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to deploy MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// ReleaseMachine releases a machine back to the pool
func (c *MAASClient) ReleaseMachine(ctx context.Context, systemIDs []string, comment string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if len(systemIDs) == 0 {
		return fmt.Errorf("at least one system ID is required")
	}

	operation := func() error {
		c.logger.WithFields(logrus.Fields{
			"system_ids": systemIDs,
			"comment":    comment,
		}).Debug("Releasing MAAS machine(s)")
		err := c.client.Machines.Release(systemIDs, comment)
		if err != nil {
			c.logger.WithError(err).WithField("system_ids", systemIDs).Error("Failed to release MAAS machine(s)")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	return c.retry(ctx, operation)
}

// PowerOnMachine powers on a machine
func (c *MAASClient) PowerOnMachine(ctx context.Context, systemID string) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithField("system_id", systemID).Debug("Powering on MAAS machine")
		params := &entity.MachinePowerOnParams{} // Default parameters
		entityMachine, err = c.client.Machine.PowerOn(systemID, params)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to power on MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// PowerOffMachine powers off a machine
func (c *MAASClient) PowerOffMachine(ctx context.Context, systemID string) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithField("system_id", systemID).Debug("Powering off MAAS machine")
		params := &entity.MachinePowerOffParams{} // Default parameters
		entityMachine, err = c.client.Machine.PowerOff(systemID, params)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to power off MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// GetMachineStatus gets the current status of a machine
func (c *MAASClient) GetMachineStatus(ctx context.Context, systemID string) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return "", fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return "", fmt.Errorf("system ID is required")
	}

	// Get the machine details
	machine, err := c.GetMachineWithDetails(ctx, systemID, true)
	if err != nil {
		return "", err
	}

	return machine.Status, nil
}

// GetMachinePowerState gets the current power state of a machine
func (c *MAASClient) GetMachinePowerState(ctx context.Context, systemID string) (string, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return "", fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return "", fmt.Errorf("system ID is required")
	}

	// Get the machine details
	machine, err := c.GetMachineWithDetails(ctx, systemID, true)
	if err != nil {
		return "", err
	}

	return machine.PowerState, nil
}

// CommissionMachine commissions a machine
func (c *MAASClient) CommissionMachine(ctx context.Context, systemID string, params *entity.MachineCommissionParams) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithFields(logrus.Fields{
			"system_id": systemID,
			"params":    fmt.Sprintf("%+v", params),
		}).Debug("Commissioning MAAS machine")
		entityMachine, err = c.client.Machine.Commission(systemID, params)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to commission MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// AbortMachineOperation aborts the current operation on a machine
func (c *MAASClient) AbortMachineOperation(ctx context.Context, systemID string, comment string) (*maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		c.logger.WithFields(logrus.Fields{
			"system_id": systemID,
			"comment":   comment,
		}).Debug("Aborting operation on MAAS machine")
		entityMachine, err = c.client.Machine.Abort(systemID, comment)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to abort operation on MAAS machine")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Machine to maas.Machine
	machine := &maas.Machine{}
	machine.FromEntity(entityMachine)

	return machine, nil
}

// ==================== Network Operations ====================

// ListSubnets retrieves all subnets
func (c *MAASClient) ListSubnets(ctx context.Context) ([]maas.Subnet, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	var entitySubnets []entity.Subnet
	operation := func() error {
		var err error
		c.logger.Debug("Listing MAAS subnets")
		entitySubnets, err = c.client.Subnets.Get()
		if err != nil {
			c.logger.WithError(err).Error("Failed to list MAAS subnets")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Subnet to maas.Subnet
	subnets := make([]maas.Subnet, len(entitySubnets))
	for i, entitySubnet := range entitySubnets {
		var subnet maas.Subnet
		subnet.FromEntity(&entitySubnet)
		subnets[i] = subnet
	}

	return subnets, nil
}

// GetSubnet retrieves subnet details
func (c *MAASClient) GetSubnet(ctx context.Context, id int) (*maas.Subnet, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if id <= 0 {
		return nil, fmt.Errorf("valid subnet ID is required")
	}

	var entitySubnet *entity.Subnet
	operation := func() error {
		var err error
		c.logger.WithField("subnet_id", id).Debug("Getting MAAS subnet")
		entitySubnet, err = c.client.Subnet.Get(id)
		if err != nil {
			c.logger.WithError(err).WithField("subnet_id", id).Error("Failed to get MAAS subnet")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Subnet to maas.Subnet
	subnet := &maas.Subnet{}
	subnet.FromEntity(entitySubnet)

	return subnet, nil
}

// ListVLANs retrieves all VLANs for a fabric
func (c *MAASClient) ListVLANs(ctx context.Context, fabricID int) ([]maas.VLAN, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	var entityVLANs []entity.VLAN
	operation := func() error {
		var err error
		c.logger.WithField("fabric_id", fabricID).Debug("Listing MAAS VLANs")
		entityVLANs, err = c.client.VLANs.Get(fabricID)
		if err != nil {
			c.logger.WithError(err).WithField("fabric_id", fabricID).Error("Failed to list MAAS VLANs")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.VLAN to maas.VLAN
	vlans := make([]maas.VLAN, len(entityVLANs))
	for i, entityVLAN := range entityVLANs {
		var vlan maas.VLAN
		vlan.FromEntity(&entityVLAN)
		vlans[i] = vlan
	}

	return vlans, nil
}

// GetVLAN retrieves VLAN details
func (c *MAASClient) GetVLAN(ctx context.Context, fabricID, vlanID int) (*maas.VLAN, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	// List all VLANs for the fabric and find the one with the matching ID
	vlans, err := c.ListVLANs(ctx, fabricID)
	if err != nil {
		return nil, err
	}

	for _, vlan := range vlans {
		if vlan.ID == vlanID {
			return &vlan, nil
		}
	}

	return nil, TranslateError(fmt.Errorf("VLAN with ID %d not found in fabric %d", vlanID, fabricID), http.StatusNotFound)
}

// ListFabrics retrieves all fabrics
func (c *MAASClient) ListFabrics(ctx context.Context) ([]maas.Fabric, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	var entityFabrics []entity.Fabric
	operation := func() error {
		var err error
		c.logger.Debug("Listing MAAS fabrics")
		entityFabrics, err = c.client.Fabrics.Get()
		if err != nil {
			c.logger.WithError(err).Error("Failed to list MAAS fabrics")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Fabric to maas.Fabric
	fabrics := make([]maas.Fabric, len(entityFabrics))
	for i, entityFabric := range entityFabrics {
		var fabric maas.Fabric
		fabric.FromEntity(&entityFabric)
		fabrics[i] = fabric
	}

	return fabrics, nil
}

// GetFabric retrieves fabric details
func (c *MAASClient) GetFabric(ctx context.Context, fabricID int) (*maas.Fabric, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	// List all fabrics and find the one with the matching ID
	fabrics, err := c.ListFabrics(ctx)
	if err != nil {
		return nil, err
	}

	for _, fabric := range fabrics {
		if fabric.ID == fabricID {
			return &fabric, nil
		}
	}

	return nil, TranslateError(fmt.Errorf("fabric with ID %d not found", fabricID), http.StatusNotFound)
}

// CreateSubnet creates a new subnet
func (c *MAASClient) CreateSubnet(ctx context.Context, params map[string]interface{}) (*maas.Subnet, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	// Note: The gomaasclient library doesn't provide a direct method to create a subnet
	// This is a placeholder implementation
	c.logger.WithField("params", params).Warn("CreateSubnet operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// UpdateSubnet updates an existing subnet
func (c *MAASClient) UpdateSubnet(ctx context.Context, id int, params map[string]interface{}) (*maas.Subnet, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if id <= 0 {
		return nil, fmt.Errorf("valid subnet ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to update a subnet
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"subnet_id": id,
		"params":    params,
	}).Warn("UpdateSubnet operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// DeleteSubnet deletes a subnet
func (c *MAASClient) DeleteSubnet(ctx context.Context, id int) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if id <= 0 {
		return fmt.Errorf("valid subnet ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to delete a subnet
	// This is a placeholder implementation
	c.logger.WithField("subnet_id", id).Warn("DeleteSubnet operation is not directly supported by gomaasclient")

	return fmt.Errorf("operation not supported by the underlying client library")
}

// GetMachineInterfaces retrieves network interfaces for a specific machine
func (c *MAASClient) GetMachineInterfaces(ctx context.Context, systemID string) ([]maas.NetworkInterface, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityInterfaces []entity.NetworkInterface
	operation := func() error {
		var err error
		c.logger.WithField("system_id", systemID).Debug("Getting MAAS machine network interfaces")
		entityInterfaces, err = c.client.NetworkInterfaces.Get(systemID)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine network interfaces")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.NetworkInterface to maas.NetworkInterface
	interfaces := make([]maas.NetworkInterface, len(entityInterfaces))
	for i, entityInterface := range entityInterfaces {
		var iface maas.NetworkInterface
		iface.FromEntity(&entityInterface)
		interfaces[i] = iface
	}

	return interfaces, nil
}

// ==================== Storage Operations ====================

// GetMachineBlockDevices retrieves block devices for a specific machine
func (c *MAASClient) GetMachineBlockDevices(ctx context.Context, systemID string) ([]maas.BlockDevice, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	var entityDevices []entity.BlockDevice
	operation := func() error {
		var err error
		c.logger.WithField("system_id", systemID).Debug("Getting MAAS machine block devices")
		entityDevices, err = c.client.BlockDevices.Get(systemID)
		if err != nil {
			c.logger.WithError(err).WithField("system_id", systemID).Error("Failed to get MAAS machine block devices")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.BlockDevice to maas.BlockDevice
	devices := make([]maas.BlockDevice, len(entityDevices))
	for i, entityDevice := range entityDevices {
		var device maas.BlockDevice
		device.FromEntity(&entityDevice)
		devices[i] = device
	}

	return devices, nil
}

// CreateMachineBlockDevice creates a block device for a specific machine
func (c *MAASClient) CreateMachineBlockDevice(ctx context.Context, systemID string, params map[string]interface{}) (*maas.BlockDevice, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to create a block device
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"system_id": systemID,
		"params":    params,
	}).Warn("CreateMachineBlockDevice operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// UpdateMachineBlockDevice updates a block device for a specific machine
func (c *MAASClient) UpdateMachineBlockDevice(ctx context.Context, systemID string, blockDeviceID int, params map[string]interface{}) (*maas.BlockDevice, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return nil, fmt.Errorf("valid block device ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to update a block device
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"system_id":       systemID,
		"block_device_id": blockDeviceID,
		"params":          params,
	}).Warn("UpdateMachineBlockDevice operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// DeleteMachineBlockDevice deletes a block device for a specific machine
func (c *MAASClient) DeleteMachineBlockDevice(ctx context.Context, systemID string, blockDeviceID int) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return fmt.Errorf("valid block device ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to delete a block device
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"system_id":       systemID,
		"block_device_id": blockDeviceID,
	}).Warn("DeleteMachineBlockDevice operation is not directly supported by gomaasclient")

	return fmt.Errorf("operation not supported by the underlying client library")
}

// CreateMachinePartition creates a partition on a block device for a specific machine
func (c *MAASClient) CreateMachinePartition(ctx context.Context, systemID string, blockDeviceID int, params map[string]interface{}) (*maas.Partition, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return nil, fmt.Errorf("valid block device ID is required")
	}

	// Validate required parameters
	if _, ok := params["size"]; !ok {
		return nil, fmt.Errorf("partition size is required")
	}

	// Construct the API endpoint
	endpoint := fmt.Sprintf("/api/2.0/machines/%s/block-devices/%d/partitions/", systemID, blockDeviceID)

	var partition maas.Partition
	operation := func() error {
		c.logger.WithFields(logrus.Fields{
			"system_id":       systemID,
			"block_device_id": blockDeviceID,
			"params":          params,
		}).Debug("Creating partition on MAAS machine block device")

		req, err := c.newRequest(ctx, "POST", endpoint, params)
		if err != nil {
			return err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.WithError(err).Error("Failed to create partition")
			return TranslateError(err, http.StatusInternalServerError)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			err = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			c.logger.WithError(err).Error("Failed to create partition")
			return TranslateError(err, resp.StatusCode)
		}

		if err := json.NewDecoder(resp.Body).Decode(&partition); err != nil {
			c.logger.WithError(err).Error("Failed to decode partition response")
			return TranslateError(err, http.StatusInternalServerError)
		}

		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	return &partition, nil
}

// DeleteMachinePartition deletes a partition from a block device for a specific machine
func (c *MAASClient) DeleteMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return fmt.Errorf("valid block device ID is required")
	}

	if partitionID <= 0 {
		return fmt.Errorf("valid partition ID is required")
	}

	// Construct the API endpoint
	endpoint := fmt.Sprintf("/api/2.0/machines/%s/block-devices/%d/partitions/%d/", systemID, blockDeviceID, partitionID)

	operation := func() error {
		c.logger.WithFields(logrus.Fields{
			"system_id":       systemID,
			"block_device_id": blockDeviceID,
			"partition_id":    partitionID,
		}).Debug("Deleting partition from MAAS machine block device")

		req, err := c.newRequest(ctx, "DELETE", endpoint, nil)
		if err != nil {
			return err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.WithError(err).Error("Failed to delete partition")
			return TranslateError(err, http.StatusInternalServerError)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
			err = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			c.logger.WithError(err).Error("Failed to delete partition")
			return TranslateError(err, resp.StatusCode)
		}

		return nil
	}

	return c.retry(ctx, operation)
}

// UpdateMachinePartition updates a partition on a block device for a specific machine
func (c *MAASClient) UpdateMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*maas.Partition, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return nil, fmt.Errorf("valid block device ID is required")
	}

	if partitionID <= 0 {
		return nil, fmt.Errorf("valid partition ID is required")
	}

	// Construct the API endpoint
	endpoint := fmt.Sprintf("/api/2.0/machines/%s/block-devices/%d/partitions/%d/", systemID, blockDeviceID, partitionID)

	var partition maas.Partition
	operation := func() error {
		c.logger.WithFields(logrus.Fields{
			"system_id":       systemID,
			"block_device_id": blockDeviceID,
			"partition_id":    partitionID,
			"params":          params,
		}).Debug("Updating partition on MAAS machine block device")

		req, err := c.newRequest(ctx, "PUT", endpoint, params)
		if err != nil {
			return err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.WithError(err).Error("Failed to update partition")
			return TranslateError(err, http.StatusInternalServerError)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			err = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			c.logger.WithError(err).Error("Failed to update partition")
			return TranslateError(err, resp.StatusCode)
		}

		if err := json.NewDecoder(resp.Body).Decode(&partition); err != nil {
			c.logger.WithError(err).Error("Failed to decode partition response")
			return TranslateError(err, http.StatusInternalServerError)
		}

		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	return &partition, nil
}

// FormatMachinePartition formats a partition on a block device for a specific machine
func (c *MAASClient) FormatMachinePartition(ctx context.Context, systemID string, blockDeviceID, partitionID int, params map[string]interface{}) (*maas.Filesystem, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	if blockDeviceID <= 0 {
		return nil, fmt.Errorf("valid block device ID is required")
	}

	if partitionID <= 0 {
		return nil, fmt.Errorf("valid partition ID is required")
	}

	// Validate required parameters
	if _, ok := params["fstype"]; !ok {
		return nil, fmt.Errorf("filesystem type (fstype) is required")
	}

	// Construct the API endpoint
	endpoint := fmt.Sprintf("/api/2.0/machines/%s/block-devices/%d/partitions/%d/format/", systemID, blockDeviceID, partitionID)

	var filesystem maas.Filesystem
	operation := func() error {
		c.logger.WithFields(logrus.Fields{
			"system_id":       systemID,
			"block_device_id": blockDeviceID,
			"partition_id":    partitionID,
			"params":          params,
		}).Debug("Formatting partition on MAAS machine block device")

		req, err := c.newRequest(ctx, "POST", endpoint, params)
		if err != nil {
			return err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			c.logger.WithError(err).Error("Failed to format partition")
			return TranslateError(err, http.StatusInternalServerError)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			err = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			c.logger.WithError(err).Error("Failed to format partition")
			return TranslateError(err, resp.StatusCode)
		}

		if err := json.NewDecoder(resp.Body).Decode(&filesystem); err != nil {
			c.logger.WithError(err).Error("Failed to decode filesystem response")
			return TranslateError(err, http.StatusInternalServerError)
		}

		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	return &filesystem, nil
}

// MountMachineFilesystem mounts a filesystem for a specific machine
func (c *MAASClient) MountMachineFilesystem(ctx context.Context, systemID string, filesystemID int, params map[string]interface{}) (*maas.Filesystem, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if systemID == "" {
		return nil, fmt.Errorf("system ID is required")
	}

	if filesystemID <= 0 {
		return nil, fmt.Errorf("valid filesystem ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to mount a filesystem
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"system_id":     systemID,
		"filesystem_id": filesystemID,
		"params":        params,
	}).Warn("MountMachineFilesystem operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// GetMachineFilesystems retrieves filesystems for a specific machine
func (c *MAASClient) GetMachineFilesystems(ctx context.Context, systemID string) ([]maas.Filesystem, error) {
	// This is a placeholder as the gomaasclient doesn't have direct filesystem operations
	// We would need to get block devices and partitions, then extract filesystem information
	return nil, fmt.Errorf("not implemented")
}

// ==================== Tag Operations ====================

// ListTags retrieves all tags
func (c *MAASClient) ListTags(ctx context.Context) ([]maas.Tag, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	var entityTags []entity.Tag
	operation := func() error {
		var err error
		c.logger.Debug("Listing MAAS tags")
		entityTags, err = c.client.Tags.Get()
		if err != nil {
			c.logger.WithError(err).Error("Failed to list MAAS tags")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Tag to maas.Tag
	tags := make([]maas.Tag, len(entityTags))
	for i, entityTag := range entityTags {
		var tag maas.Tag
		tag.FromEntity(&entityTag)
		tags[i] = tag
	}

	return tags, nil
}

// GetTag retrieves tag details
func (c *MAASClient) GetTag(ctx context.Context, name string) (*maas.Tag, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if name == "" {
		return nil, fmt.Errorf("tag name is required")
	}

	var entityTag *entity.Tag
	operation := func() error {
		var err error
		c.logger.WithField("tag_name", name).Debug("Getting MAAS tag")
		entityTag, err = c.client.Tag.Get(name)
		if err != nil {
			c.logger.WithError(err).WithField("tag_name", name).Error("Failed to get MAAS tag")
			if strings.Contains(err.Error(), "404") {
				return TranslateError(err, http.StatusNotFound)
			}
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Tag to maas.Tag
	tag := &maas.Tag{}
	tag.FromEntity(entityTag)

	return tag, nil
}

// CreateTag creates a new tag
func (c *MAASClient) CreateTag(ctx context.Context, name, comment, definition string) (*maas.Tag, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if name == "" {
		return nil, fmt.Errorf("tag name is required")
	}

	var entityTag *entity.Tag
	operation := func() error {
		var err error
		c.logger.WithFields(logrus.Fields{
			"tag_name":   name,
			"comment":    comment,
			"definition": definition,
		}).Debug("Creating MAAS tag")
		params := &entity.TagParams{
			Name:       name,
			Comment:    comment,
			Definition: definition,
		}
		entityTag, err = c.client.Tags.Create(params)
		if err != nil {
			c.logger.WithError(err).WithField("tag_name", name).Error("Failed to create MAAS tag")
			return TranslateError(err, http.StatusInternalServerError)
		}
		return nil
	}

	if err := c.retry(ctx, operation); err != nil {
		return nil, err
	}

	// Convert entity.Tag to maas.Tag
	tag := &maas.Tag{}
	tag.FromEntity(entityTag)

	return tag, nil
}

// UpdateTag updates an existing tag
func (c *MAASClient) UpdateTag(ctx context.Context, name string, params map[string]interface{}) (*maas.Tag, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if name == "" {
		return nil, fmt.Errorf("tag name is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to update a tag
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"tag_name": name,
		"params":   params,
	}).Warn("UpdateTag operation is not directly supported by gomaasclient")

	return nil, fmt.Errorf("operation not supported by the underlying client library")
}

// DeleteTag deletes a tag
func (c *MAASClient) DeleteTag(ctx context.Context, name string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if name == "" {
		return fmt.Errorf("tag name is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to delete a tag
	// This is a placeholder implementation
	c.logger.WithField("tag_name", name).Warn("DeleteTag operation is not directly supported by gomaasclient")

	return fmt.Errorf("operation not supported by the underlying client library")
}

// ApplyTagToMachine applies a tag to a machine
func (c *MAASClient) ApplyTagToMachine(ctx context.Context, tagName, systemID string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if tagName == "" {
		return fmt.Errorf("tag name is required")
	}

	if systemID == "" {
		return fmt.Errorf("system ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to add a tag to a machine
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"tag_name":  tagName,
		"system_id": systemID,
	}).Warn("ApplyTagToMachine operation is not directly supported by gomaasclient")

	// No retry needed as we're not making an API call
	return fmt.Errorf("operation not supported by the underlying client library")
}

// RemoveTagFromMachine removes a tag from a machine
func (c *MAASClient) RemoveTagFromMachine(ctx context.Context, tagName, systemID string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return fmt.Errorf("client is closed")
	}

	if tagName == "" {
		return fmt.Errorf("tag name is required")
	}

	if systemID == "" {
		return fmt.Errorf("system ID is required")
	}

	// Note: The gomaasclient library doesn't provide a direct method to remove a tag from a machine
	// This is a placeholder implementation
	c.logger.WithFields(logrus.Fields{
		"tag_name":  tagName,
		"system_id": systemID,
	}).Warn("RemoveTagFromMachine operation is not directly supported by gomaasclient")

	// No retry needed as we're not making an API call
	return fmt.Errorf("operation not supported by the underlying client library")
}

// GetMachinesWithTag retrieves all machines with a specific tag
func (c *MAASClient) GetMachinesWithTag(ctx context.Context, tagName string) ([]maas.Machine, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.closed {
		return nil, fmt.Errorf("client is closed")
	}

	if tagName == "" {
		return nil, fmt.Errorf("tag name is required")
	}

	// Use the ListMachines method with a filter for the tag
	filters := map[string]string{
		"tags": tagName,
	}

	machines, _, err := c.ListMachines(ctx, filters, nil)
	return machines, err
}

// ListMachinesSimple retrieves machines based on filters without pagination
func (c *MAASClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]maas.Machine, error) {
	machines, _, err := c.ListMachines(ctx, filters, nil)
	return machines, err
}
