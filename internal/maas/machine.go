package maas

import (
	"context"
	"fmt"
	"time"

	"github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
)

// machineClient implements the common.MachineClient interface
type machineClient struct {
	client *client.Client
	logger *logrus.Logger
	retry  common.RetryFunc
}

// newMachineClient creates a new machine client
func newMachineClient(client *client.Client, logger *logrus.Logger, retry common.RetryFunc) common.MachineClient {
	return &machineClient{
		client: client,
		logger: logger,
		retry:  retry,
	}
}

// ListMachines retrieves machines based on filters with pagination.
func (m *machineClient) ListMachines(ctx context.Context, filters map[string]string, pagination *types.PaginationOptions) ([]types.Machine, int, error) {
	params := &entity.MachinesParams{}
	if id, ok := filters["id"]; ok && id != "" {
		params.ID = []string{id}
	} else if systemID, ok := filters["system_id"]; ok && systemID != "" {
		params.ID = []string{systemID}
	}

	if hostname, ok := filters["hostname"]; ok && hostname != "" {
		params.Hostname = []string{hostname}
	}
	if macAddress, ok := filters["mac_address"]; ok && macAddress != "" {
		params.MACAddress = []string{macAddress}
	}
	if domain, ok := filters["domain"]; ok && domain != "" {
		params.Domain = []string{domain}
	}
	if agentName, ok := filters["agent_name"]; ok && agentName != "" {
		params.AgentName = []string{agentName}
	}
	if zone, ok := filters["zone"]; ok && zone != "" {
		params.Zone = []string{zone}
	}
	if pool, ok := filters["pool"]; ok && pool != "" {
		params.Pool = []string{pool}
	}

	// Tags and NotTags are typically []string
	if tags, ok := filters["tags"]; ok && tags != "" {
		// If filters["tags"] is a comma-separated string, it needs to be split.
		// For now, assuming it's passed as a single tag name.
		// To support comma-separated tags from filter: params.Tags = strings.Split(tags, ",")
		params.Tags = []string{tags}
	}
	if notTags, ok := filters["not_tags"]; ok && notTags != "" {
		params.NotTags = []string{notTags}
	}
	// gomaasclient does not directly support pagination by offset/limit in MachinesParams.
	// It fetches all matching machines. Pagination would need to be handled client-side if strictly required.

	var entityMachines []entity.Machine
	operation := func() error {
		var err error
		entityMachines, err = m.client.Machines.Get(params)
		if err != nil {
			m.logger.Errorf("MAAS API error listing machines: %v", err)
			return fmt.Errorf("maas API error listing machines: %w", err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, 0, err
	}

	modelMachines := make([]types.Machine, len(entityMachines))
	for i, em := range entityMachines {
		var mm types.Machine
		mm.FromEntity(&em) // Use the FromEntity method from models.Machine
		modelMachines[i] = mm
	}
	return modelMachines, len(modelMachines), nil
}

// GetMachine retrieves details for a specific machine.
func (m *machineClient) GetMachine(systemID string) (*types.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		entityMachine, err = m.client.Machine.Get(systemID)
		if err != nil {
			m.logger.Errorf("MAAS API error getting machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting machine %s: %w", systemID, err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}

	var modelMachine types.Machine
	modelMachine.FromEntity(entityMachine)

	// Get network interfaces
	networkClient := newNetworkClient(m.client, m.logger, m.retry)
	interfaces, err := networkClient.GetMachineInterfaces(systemID)
	if err != nil {
		m.logger.WithError(err).Warn("Failed to get machine interfaces")
		// Continue with partial data
	} else {
		modelMachine.Interfaces = interfaces
	}

	return &modelMachine, nil
}

// AllocateMachine allocates a machine based on constraints.
func (m *machineClient) AllocateMachine(params *entity.MachineAllocateParams) (*types.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		entityMachine, err = m.client.Machines.Allocate(params)
		if err != nil {
			m.logger.Errorf("MAAS API error allocating machine: %v", err)
			return fmt.Errorf("maas API error allocating machine: %w", err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	var modelMachine types.Machine
	modelMachine.FromEntity(entityMachine)
	return &modelMachine, nil
}

// DeployMachine deploys an allocated machine.
func (m *machineClient) DeployMachine(systemID string, params *entity.MachineDeployParams) (*types.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		entityMachine, err = m.client.Machine.Deploy(systemID, params)
		if err != nil {
			m.logger.Errorf("MAAS API error deploying machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error deploying machine %s: %w", systemID, err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	var modelMachine types.Machine
	modelMachine.FromEntity(entityMachine)
	return &modelMachine, nil
}

// ReleaseMachine releases a machine back to the pool.
func (m *machineClient) ReleaseMachine(systemIDs []string, comment string) error {
	operation := func() error {
		err := m.client.Machines.Release(systemIDs, comment)
		if err != nil {
			m.logger.Errorf("MAAS API error releasing machines %v: %v", systemIDs, err)
			return fmt.Errorf("maas API error releasing machines %v: %w", systemIDs, err)
		}
		return nil
	}

	return m.retry(operation, 3, 2*time.Second)
}

// PowerOnMachine powers on a machine.
func (m *machineClient) PowerOnMachine(systemID string) (*types.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		// gomaasclient PowerOn takes MachinePowerOnParams, not PowerOnMachineParams
		powerParams := &entity.MachinePowerOnParams{}
		entityMachine, err = m.client.Machine.PowerOn(systemID, powerParams)
		if err != nil {
			m.logger.Errorf("MAAS API error powering on machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error powering on machine %s: %w", systemID, err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	var modelMachine types.Machine
	modelMachine.FromEntity(entityMachine)
	return &modelMachine, nil
}

// PowerOffMachine powers off a machine.
func (m *machineClient) PowerOffMachine(systemID string) (*types.Machine, error) {
	var entityMachine *entity.Machine
	operation := func() error {
		var err error
		// gomaasclient PowerOff takes MachinePowerOffParams
		powerParams := &entity.MachinePowerOffParams{}
		entityMachine, err = m.client.Machine.PowerOff(systemID, powerParams)
		if err != nil {
			m.logger.Errorf("MAAS API error powering off machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error powering off machine %s: %w", systemID, err)
		}
		return nil
	}

	err := m.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	var modelMachine types.Machine
	modelMachine.FromEntity(entityMachine)
	return &modelMachine, nil
}

// ListMachinesSimple retrieves machines based on filters without pagination.
func (m *machineClient) ListMachinesSimple(ctx context.Context, filters map[string]string) ([]types.Machine, error) {
	// Calls ListMachines with no pagination. The total count is ignored.
	machines, _, err := m.ListMachines(ctx, filters, nil)
	return machines, err
}

// GetMachineWithDetails retrieves details for a specific machine with optional detailed information.
// For now, this is equivalent to GetMachine as gomaasclient.Machine.Get() fetches standard details.
// If more details are needed and MAAS API provides a way, this can be expanded.
func (m *machineClient) GetMachineWithDetails(ctx context.Context, systemID string, includeDetails bool) (*types.Machine, error) {
	return m.GetMachine(systemID)
}

// CheckStorageConstraints checks if a machine meets the specified storage constraints.
// This method's placement on MachineClient is for convenience.
// The actual MAAS API for constraint validation is likely via StorageClient.ValidateStorageConstraints.
// For ClientWrapper, this can be a simple pass-through or a local check if feasible.
// For now, returning true to satisfy interface. Actual logic might be in the service layer or delegate to StorageClient.
func (m *machineClient) CheckStorageConstraints(machine *types.Machine, constraints *types.SimpleStorageConstraint) bool {
	// Placeholder implementation.
	// A real implementation might involve calling a MAAS endpoint if one exists for this specific check,
	// or performing a local evaluation based on machine.BlockDevices and constraints.
	// Given StorageClient.ValidateStorageConstraints, this might be redundant or for a different purpose.
	m.logger.Warnf("CheckStorageConstraints on machineClient is a placeholder and currently returns true.")
	return true
}
