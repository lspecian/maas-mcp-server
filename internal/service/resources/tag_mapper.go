package resources

import (
	"fmt"

	"github.com/lspecian/maas-mcp-server/internal/errors"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	maasmodels "github.com/lspecian/maas-mcp-server/internal/models/maas"
)

// TagResourceMapper handles mapping between MAAS Tag and MCP TagContext
type TagResourceMapper struct {
	BaseResourceMapper
}

// NewTagResourceMapper creates a new tag resource mapper
func NewTagResourceMapper(logger *logging.Logger) *TagResourceMapper {
	return &TagResourceMapper{
		BaseResourceMapper: BaseResourceMapper{
			Name:   "tag",
			Logger: logger,
		},
	}
}

// MapToMCP maps a MAAS Tag to an MCP TagContext
func (m *TagResourceMapper) MapToMCP(maasResource interface{}) (interface{}, error) {
	tag, ok := maasResource.(*maasmodels.Tag)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *maasmodels.Tag, got %T", maasResource),
			nil,
		)
	}

	// Validate the tag
	if err := tag.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MAAS Tag: %s", err.Error()),
			err,
		)
	}

	ctx := &models.TagContext{
		Name:        tag.Name,
		Description: tag.Description,
		// Default values for fields not available in MAAS
		Color:    "#808080", // Default gray
		Category: "general",
	}

	// Use comment as category if available
	if tag.Comment != "" {
		ctx.Category = tag.Comment
	}

	return ctx, nil
}

// MapToMaas maps an MCP TagContext to a MAAS Tag
func (m *TagResourceMapper) MapToMaas(mcpResource interface{}) (interface{}, error) {
	ctx, ok := mcpResource.(*models.TagContext)
	if !ok {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Expected *models.TagContext, got %T", mcpResource),
			nil,
		)
	}

	// Validate the tag context
	if err := ctx.Validate(); err != nil {
		return nil, errors.NewValidationError(
			fmt.Sprintf("Invalid MCP TagContext: %s", err.Error()),
			err,
		)
	}

	tag := &maasmodels.Tag{
		Name:        ctx.Name,
		Description: ctx.Description,
	}

	// Use category as comment if available
	if ctx.Category != "" && ctx.Category != "general" {
		tag.Comment = ctx.Category
	}

	return tag, nil
}
