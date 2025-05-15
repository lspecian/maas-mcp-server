package maas

import (
	"fmt"

	gomaasclient "github.com/canonical/gomaasclient/client"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/maas/storage"
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// ClientWrapper provides an abstraction layer over gomaasclient.
// It uses composition to include all client implementations.
type ClientWrapper struct {
	common.MachineClient
	common.NetworkClient
	common.TagClient
	common.BlockDeviceClient
	common.StorageConstraintsClient
	common.VolumeGroupClient
	common.RAIDClient

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

	// Create the retry function
	retryFunc := common.CreateRetryFunc(logger)

	// Create the client wrapper with all client implementations
	return &ClientWrapper{
		MachineClient:            newMachineClient(client, logger, retryFunc),
		NetworkClient:            newNetworkClient(client, logger, retryFunc),
		TagClient:                newTagClient(client, logger, retryFunc),
		BlockDeviceClient:        storage.NewBlockDeviceClient(client, logger, retryFunc),
		StorageConstraintsClient: storage.NewConstraintsClient(client, logger, retryFunc),
		VolumeGroupClient:        storage.NewVolumeGroupClient(client, logger, retryFunc),
		RAIDClient:               storage.NewRAIDClient(client, logger, retryFunc),
		client:                   client,
		logger:                   logger,
	}, nil
}

// Implement the common.StorageClient interface by combining BlockDeviceClient and StorageConstraintsClient
func (c *ClientWrapper) ApplyStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	return c.StorageConstraintsClient.ApplyStorageConstraints(systemID, params)
}

func (c *ClientWrapper) SetStorageConstraints(systemID string, params models.StorageConstraintParams) error {
	return c.StorageConstraintsClient.SetStorageConstraints(systemID, params)
}

func (c *ClientWrapper) GetStorageConstraints(systemID string) (*models.StorageConstraintParams, error) {
	return c.StorageConstraintsClient.GetStorageConstraints(systemID)
}

func (c *ClientWrapper) ValidateStorageConstraints(systemID string, params models.StorageConstraintParams) (bool, []string, error) {
	return c.StorageConstraintsClient.ValidateStorageConstraints(systemID, params)
}

func (c *ClientWrapper) DeleteStorageConstraints(systemID string) error {
	return c.StorageConstraintsClient.DeleteStorageConstraints(systemID)
}
