package maas

import (
	"fmt"

	gomaasclient "github.com/canonical/gomaasclient/client"
	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/maas/common"
	"github.com/lspecian/maas-mcp-server/internal/maas/storage"
	"github.com/lspecian/maas-mcp-server/internal/models/types"
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
	logger.WithFields(logrus.Fields{
		"api_url":     apiURL,
		"api_version": apiVersion,
		"api_key_set": apiKey != "",
	}).Debug("Creating MAAS client wrapper")

	if apiVersion == "" {
		apiVersion = "2.0" // Default to 2.0 as per docs [15, 28]
		logger.Debug("No API version specified, using default: 2.0")
	}

	if apiURL == "" {
		logger.Error("MAAS API URL is empty")
		return nil, fmt.Errorf("MAAS API URL cannot be empty")
	}

	if apiKey == "" {
		logger.Error("MAAS API key is empty")
		return nil, fmt.Errorf("MAAS API key cannot be empty")
	}

	logger.Debug("Attempting to create gomaasclient")
	client, err := gomaasclient.GetClient(apiURL, apiKey, apiVersion)
	if err != nil {
		logger.WithError(err).Error("Failed to get gomaasclient")
		return nil, fmt.Errorf("failed to get gomaasclient: %w", err)
	}
	logger.Debug("Successfully created gomaasclient")

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
func (c *ClientWrapper) ApplyStorageConstraints(systemID string, params types.StorageConstraintParams) error {
	return c.StorageConstraintsClient.ApplyStorageConstraints(systemID, params)
}

func (c *ClientWrapper) SetStorageConstraints(systemID string, params types.StorageConstraintParams) error {
	return c.StorageConstraintsClient.SetStorageConstraints(systemID, params)
}

func (c *ClientWrapper) GetStorageConstraints(systemID string) (*types.StorageConstraintParams, error) {
	return c.StorageConstraintsClient.GetStorageConstraints(systemID)
}

func (c *ClientWrapper) ValidateStorageConstraints(systemID string, params types.StorageConstraintParams) (bool, []string, error) {
	return c.StorageConstraintsClient.ValidateStorageConstraints(systemID, params)
}

func (c *ClientWrapper) DeleteStorageConstraints(systemID string) error {
	return c.StorageConstraintsClient.DeleteStorageConstraints(systemID)
}
