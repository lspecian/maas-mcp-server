package service

import (
	"context"
	"net/http"

	"github.com/sirupsen/logrus"

	"github.com/lspecian/maas-mcp-server/internal/models"
)

// TagClient defines the interface for MAAS client operations needed by the tag service
type TagClient interface {
	// ListTags retrieves all tags
	ListTags() ([]models.Tag, error)

	// CreateTag creates a new tag
	CreateTag(name, comment, definition string) (*models.Tag, error)

	// ApplyTagToMachine applies a tag to a machine
	ApplyTagToMachine(tagName, systemID string) error

	// RemoveTagFromMachine removes a tag from a machine
	RemoveTagFromMachine(tagName, systemID string) error
}

// TagService handles tag management operations
type TagService struct {
	maasClient TagClient
	logger     *logrus.Logger
}

// NewTagService creates a new tag service instance
func NewTagService(client TagClient, logger *logrus.Logger) *TagService {
	return &TagService{
		maasClient: client,
		logger:     logger,
	}
}

// ListTags retrieves all tags
func (s *TagService) ListTags(ctx context.Context) ([]models.TagContext, error) {
	s.logger.Debug("Listing tags")

	// Call MAAS client to list tags
	tags, err := s.maasClient.ListTags()
	if err != nil {
		s.logger.WithError(err).Error("Failed to list tags from MAAS")
		return nil, mapClientError(err)
	}

	// Convert MAAS tags to MCP context
	result := make([]models.TagContext, len(tags))
	for i, t := range tags {
		tagContext := models.MaasTagToMCPContext(&t)
		result[i] = *tagContext
	}

	s.logger.WithField("count", len(result)).Debug("Successfully retrieved tags")
	return result, nil
}

// CreateTag creates a new tag
func (s *TagService) CreateTag(ctx context.Context, name string, comment string) (models.TagContext, error) {
	s.logger.WithFields(logrus.Fields{
		"name":    name,
		"comment": comment,
	}).Debug("Creating tag")

	// Validate parameters
	if name == "" {
		return models.TagContext{}, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Tag name is required",
		}
	}

	// Validate tag name format
	tag := &models.Tag{Name: name}
	if err := tag.Validate(); err != nil {
		return models.TagContext{}, &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
		}
	}

	// Call MAAS client to create tag
	// Definition is left empty as it's not required for basic tag creation
	createdTag, err := s.maasClient.CreateTag(name, comment, "")
	if err != nil {
		s.logger.WithError(err).WithField("name", name).Error("Failed to create tag in MAAS")
		return models.TagContext{}, mapClientError(err)
	}

	// Convert MAAS tag to MCP context
	result := models.MaasTagToMCPContext(createdTag)

	s.logger.WithField("name", name).Info("Successfully created tag")
	return *result, nil
}

// ApplyTagToMachine applies a tag to a machine
func (s *TagService) ApplyTagToMachine(ctx context.Context, tagName string, machineID string) error {
	s.logger.WithFields(logrus.Fields{
		"tag_name":   tagName,
		"machine_id": machineID,
	}).Debug("Applying tag to machine")

	// Validate parameters
	if tagName == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Tag name is required",
		}
	}

	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to apply tag to machine
	err := s.maasClient.ApplyTagToMachine(tagName, machineID)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"tag_name":   tagName,
			"machine_id": machineID,
		}).Error("Failed to apply tag to machine in MAAS")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"tag_name":   tagName,
		"machine_id": machineID,
	}).Info("Successfully applied tag to machine")

	return nil
}

// RemoveTagFromMachine removes a tag from a machine
func (s *TagService) RemoveTagFromMachine(ctx context.Context, tagName string, machineID string) error {
	s.logger.WithFields(logrus.Fields{
		"tag_name":   tagName,
		"machine_id": machineID,
	}).Debug("Removing tag from machine")

	// Validate parameters
	if tagName == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Tag name is required",
		}
	}

	if machineID == "" {
		return &ServiceError{
			Err:        ErrBadRequest,
			StatusCode: http.StatusBadRequest,
			Message:    "Machine ID is required",
		}
	}

	// Call MAAS client to remove tag from machine
	err := s.maasClient.RemoveTagFromMachine(tagName, machineID)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"tag_name":   tagName,
			"machine_id": machineID,
		}).Error("Failed to remove tag from machine in MAAS")
		return mapClientError(err)
	}

	s.logger.WithFields(logrus.Fields{
		"tag_name":   tagName,
		"machine_id": machineID,
	}).Info("Successfully removed tag from machine")

	return nil
}
