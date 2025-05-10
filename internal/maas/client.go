package maas

import (
	"fmt"
	"time"

	gomaasclient "github.com/canonical/gomaasclient/client"
	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"
)

// ClientWrapper provides an abstraction layer over gomaasclient.
type ClientWrapper struct {
	client *gomaasclient.Client
	logger *logrus.Logger
}

// NewClientWrapper creates and initializes a new MAAS client wrapper.
// It expects MAAS URL and API Key to be provided (e.g., via config).
func NewClientWrapper(apiURL, apiKey, apiVersion string, logger *logrus.Logger) (*ClientWrapper, error) {
	if apiVersion == "" {
		apiVersion = "2.0" // Default to 2.0 as per docs [15, 28]
	}
	client, err := gomaasclient.GetClient(apiURL, apiKey, apiVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to get gomaasclient: %w", err)
	}
	return &ClientWrapper{client: client, logger: logger}, nil
}

// --- Helper function for retries ---
func (w *ClientWrapper) retry(operation func() error, attempts int, delay time.Duration) error {
	for i := 0; i < attempts; i++ {
		err := operation()
		if err == nil {
			return nil
		}
		w.logger.Warnf("Attempt %d failed: %v", i+1, err)
		time.Sleep(delay)
	}
	return fmt.Errorf("failed after %d attempts", attempts)
}

// --- Example Wrapper Methods ---

// ListMachines retrieves machines based on parameters.
func (w *ClientWrapper) ListMachines(params *entity.MachinesParams) ([]entity.Machine, error) {
	var machines []entity.Machine
	operation := func() error {
		var err error
		machines, err = w.client.Machines.Get(params)
		if err != nil {
			w.logger.Errorf("MAAS API error listing machines: %v", err)
			return fmt.Errorf("maas API error listing machines: %w", err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machines, nil
}

// GetMachine retrieves details for a specific machine.
func (w *ClientWrapper) GetMachine(systemID string) (*entity.Machine, error) {
	var machine *entity.Machine
	operation := func() error {
		var err error
		machine, err = w.client.Machine.Get(systemID)
		if err != nil {
			w.logger.Errorf("MAAS API error getting machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machine, nil
}

// AllocateMachine allocates a machine based on constraints.
func (w *ClientWrapper) AllocateMachine(params *entity.MachineAllocateParams) (*entity.Machine, error) {
	var machine *entity.Machine
	operation := func() error {
		var err error
		machine, err = w.client.Machines.Allocate(params)
		if err != nil {
			w.logger.Errorf("MAAS API error allocating machine: %v", err)
			return fmt.Errorf("maas API error allocating machine: %w", err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machine, nil
}

// DeployMachine deploys an allocated machine.
func (w *ClientWrapper) DeployMachine(systemID string, params *entity.MachineDeployParams) (*entity.Machine, error) {
	var machine *entity.Machine
	operation := func() error {
		var err error
		machine, err = w.client.Machine.Deploy(systemID, params)
		if err != nil {
			w.logger.Errorf("MAAS API error deploying machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error deploying machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machine, nil
}

// ReleaseMachine releases a machine back to the pool.
func (w *ClientWrapper) ReleaseMachine(systemIDs []string, comment string) error {
	operation := func() error {
		err := w.client.Machines.Release(systemIDs, comment)
		if err != nil {
			w.logger.Errorf("MAAS API error releasing machines %v: %v", systemIDs, err)
			return fmt.Errorf("maas API error releasing machines %v: %w", systemIDs, err)
		}
		return nil
	}

	return w.retry(operation, 3, 2*time.Second)
}

// GetSubnet retrieves subnet details.
func (w *ClientWrapper) GetSubnet(id int) (*entity.Subnet, error) {
	var subnet *entity.Subnet
	operation := func() error {
		var err error
		subnet, err = w.client.Subnet.Get(id)
		if err != nil {
			w.logger.Errorf("MAAS API error getting subnet %d: %v", id, err)
			return fmt.Errorf("maas API error getting subnet %d: %w", id, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return subnet, nil
}

// ListSubnets retrieves all subnets.
func (w *ClientWrapper) ListSubnets() ([]entity.Subnet, error) {
	var subnets []entity.Subnet
	operation := func() error {
		var err error
		subnets, err = w.client.Subnets.Get() // Assuming Get() without params lists all
		if err != nil {
			w.logger.Errorf("MAAS API error listing subnets: %v", err)
			return fmt.Errorf("maas API error listing subnets: %w", err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return subnets, nil
}

// GetMachineBlockDevices retrieves block devices for a specific machine.
func (w *ClientWrapper) GetMachineBlockDevices(systemID string) ([]entity.BlockDevice, error) {
	var devices []entity.BlockDevice
	operation := func() error {
		var err error
		devices, err = w.client.BlockDevices.Get(systemID)
		if err != nil {
			w.logger.Errorf("MAAS API error getting block devices for machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting block devices for machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return devices, nil
}

// GetMachineInterfaces retrieves network interfaces for a specific machine.
func (w *ClientWrapper) GetMachineInterfaces(systemID string) ([]entity.NetworkInterface, error) {
	var interfaces []entity.NetworkInterface
	operation := func() error {
		var err error
		interfaces, err = w.client.NetworkInterfaces.Get(systemID)
		if err != nil {
			w.logger.Errorf("MAAS API error getting network interfaces for machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error getting network interfaces for machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return interfaces, nil
}

// PowerOnMachine powers on a machine.
func (w *ClientWrapper) PowerOnMachine(systemID string) (*entity.Machine, error) {
	var machine *entity.Machine
	operation := func() error {
		var err error
		params := &entity.MachinePowerOnParams{} // Default parameters
		machine, err = w.client.Machine.PowerOn(systemID, params)
		if err != nil {
			w.logger.Errorf("MAAS API error powering on machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error powering on machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machine, nil
}

// PowerOffMachine powers off a machine.
func (w *ClientWrapper) PowerOffMachine(systemID string) (*entity.Machine, error) {
	var machine *entity.Machine
	operation := func() error {
		var err error
		params := &entity.MachinePowerOffParams{} // Default parameters
		machine, err = w.client.Machine.PowerOff(systemID, params)
		if err != nil {
			w.logger.Errorf("MAAS API error powering off machine %s: %v", systemID, err)
			return fmt.Errorf("maas API error powering off machine %s: %w", systemID, err)
		}
		return nil
	}

	err := w.retry(operation, 3, 2*time.Second)
	if err != nil {
		return nil, err
	}
	return machine, nil
}

// Add more wrapper methods for other needed MAAS operations...
