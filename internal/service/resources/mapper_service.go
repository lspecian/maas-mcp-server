package resources

import (
	"context"
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// MapperService provides mapping services between MAAS and MCP resources
type MapperService struct {
	registry *MapperRegistry
	logger   *logging.Logger
}

// NewMapperService creates a new mapper service
func NewMapperService(logger *logging.Logger) *MapperService {
	service := &MapperService{
		registry: NewMapperRegistry(logger),
		logger:   logger,
	}

	// Register mappers
	service.registerMappers()

	return service
}

// registerMappers registers all resource mappers
func (s *MapperService) registerMappers() {
	// Register machine mapper
	machineMapper := NewMachineResourceMapper(s.logger)
	if err := s.registry.RegisterMapper(machineMapper); err != nil {
		s.logger.WithError(err).Error("Failed to register machine mapper")
	}

	// Register network mapper
	networkMapper := NewNetworkResourceMapper(s.logger)
	if err := s.registry.RegisterMapper(networkMapper); err != nil {
		s.logger.WithError(err).Error("Failed to register network mapper")
	}

	// Register storage mapper
	storageMapper := NewStorageResourceMapper(s.logger)
	if err := s.registry.RegisterMapper(storageMapper); err != nil {
		s.logger.WithError(err).Error("Failed to register storage mapper")
	}

	// Register tag mapper
	tagMapper := NewTagResourceMapper(s.logger)
	if err := s.registry.RegisterMapper(tagMapper); err != nil {
		s.logger.WithError(err).Error("Failed to register tag mapper")
	}
}

// MapMachineToMCP maps a MAAS Machine to an MCP MachineContext
func (s *MapperService) MapMachineToMCP(ctx context.Context, machine *maasmodels.Machine) (*models.MachineContext, error) {
	result, err := s.registry.MapToMCP("machine", machine)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map machine to MCP: %s", err.Error()),
			err,
		)
	}

	mcpMachine, ok := result.(*models.MachineContext)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *models.MachineContext, got %T", result),
			nil,
		)
	}

	return mcpMachine, nil
}

// MapMachinesToMCP maps a slice of MAAS Machines to a slice of MCP MachineContexts
func (s *MapperService) MapMachinesToMCP(ctx context.Context, machines []maasmodels.Machine) ([]models.MachineContext, error) {
	result := make([]models.MachineContext, 0, len(machines))

	for _, machine := range machines {
		machineCopy := machine // Create a copy to avoid pointer issues
		mcpMachine, err := s.MapMachineToMCP(ctx, &machineCopy)
		if err != nil {
			s.logger.WithError(err).Warn("Failed to map machine to MCP")
			continue
		}
		result = append(result, *mcpMachine)
	}

	return result, nil
}

// MapMachineToMaas maps an MCP MachineContext to a MAAS Machine
func (s *MapperService) MapMachineToMaas(ctx context.Context, mcpMachine *models.MachineContext) (*maasmodels.Machine, error) {
	result, err := s.registry.MapToMaas("machine", mcpMachine)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map MCP machine to MAAS: %s", err.Error()),
			err,
		)
	}

	machine, ok := result.(*maasmodels.Machine)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *maasmodels.Machine, got %T", result),
			nil,
		)
	}

	return machine, nil
}

// MapNetworkToMCP maps a MAAS NetworkInterface to an MCP NetworkContext
func (s *MapperService) MapNetworkToMCP(ctx context.Context, network *maasmodels.NetworkInterface) (*models.NetworkContext, error) {
	result, err := s.registry.MapToMCP("network", network)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map network to MCP: %s", err.Error()),
			err,
		)
	}

	mcpNetwork, ok := result.(*models.NetworkContext)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *models.NetworkContext, got %T", result),
			nil,
		)
	}

	return mcpNetwork, nil
}

// MapNetworkToMaas maps an MCP NetworkContext to a MAAS NetworkInterface
func (s *MapperService) MapNetworkToMaas(ctx context.Context, mcpNetwork *models.NetworkContext) (*maasmodels.NetworkInterface, error) {
	result, err := s.registry.MapToMaas("network", mcpNetwork)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map MCP network to MAAS: %s", err.Error()),
			err,
		)
	}

	network, ok := result.(*maasmodels.NetworkInterface)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *maasmodels.NetworkInterface, got %T", result),
			nil,
		)
	}

	return network, nil
}

// MapStorageToMCP maps a MAAS BlockDevice to an MCP StorageContext
func (s *MapperService) MapStorageToMCP(ctx context.Context, storage *maasmodels.BlockDevice) (*models.StorageContext, error) {
	result, err := s.registry.MapToMCP("storage", storage)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map storage to MCP: %s", err.Error()),
			err,
		)
	}

	mcpStorage, ok := result.(*models.StorageContext)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *models.StorageContext, got %T", result),
			nil,
		)
	}

	return mcpStorage, nil
}

// MapStorageToMaas maps an MCP StorageContext to a MAAS BlockDevice
func (s *MapperService) MapStorageToMaas(ctx context.Context, mcpStorage *models.StorageContext) (*maasmodels.BlockDevice, error) {
	result, err := s.registry.MapToMaas("storage", mcpStorage)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map MCP storage to MAAS: %s", err.Error()),
			err,
		)
	}

	storage, ok := result.(*maasmodels.BlockDevice)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *maasmodels.BlockDevice, got %T", result),
			nil,
		)
	}

	return storage, nil
}

// MapTagToMCP maps a MAAS Tag to an MCP TagContext
func (s *MapperService) MapTagToMCP(ctx context.Context, tag *maasmodels.Tag) (*models.TagContext, error) {
	result, err := s.registry.MapToMCP("tag", tag)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map tag to MCP: %s", err.Error()),
			err,
		)
	}

	mcpTag, ok := result.(*models.TagContext)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *models.TagContext, got %T", result),
			nil,
		)
	}

	return mcpTag, nil
}

// MapTagToMaas maps an MCP TagContext to a MAAS Tag
func (s *MapperService) MapTagToMaas(ctx context.Context, mcpTag *models.TagContext) (*maasmodels.Tag, error) {
	result, err := s.registry.MapToMaas("tag", mcpTag)
	if err != nil {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Failed to map MCP tag to MAAS: %s", err.Error()),
			err,
		)
	}

	tag, ok := result.(*maasmodels.Tag)
	if !ok {
		return nil, errors.NewMappingError(
			fmt.Sprintf("Expected *maasmodels.Tag, got %T", result),
			nil,
		)
	}

	return tag, nil
}

// MapTagsToMCP maps a slice of MAAS Tags to a slice of MCP TagContexts
func (s *MapperService) MapTagsToMCP(ctx context.Context, tags []maasmodels.Tag) ([]models.TagContext, error) {
	result := make([]models.TagContext, 0, len(tags))

	for _, tag := range tags {
		tagCopy := tag // Create a copy to avoid pointer issues
		mcpTag, err := s.MapTagToMCP(ctx, &tagCopy)
		if err != nil {
			s.logger.WithError(err).Warn("Failed to map tag to MCP")
			continue
		}
		result = append(result, *mcpTag)
	}

	return result, nil
}
