package mcp

import (
	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/auth"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/transport"
)

// Server represents the MCP server
type Server struct {
	handler    *Handler
	middleware *Middleware
	service    Service
	logger     *logging.Logger
	config     *models.AppConfig
}

// NewServer creates a new MCP server
func NewServer(
	mcpService *service.MCPService,
	storageConstraintsService transport.StorageConstraintsServiceInterface, // Added
	logger *logging.Logger,
	config *models.AppConfig,
	authHandler *auth.Middleware,
) *Server {
	// Create service
	// Pass the new storageConstraintsService to NewServiceImpl
	service := NewServiceImpl(mcpService, storageConstraintsService, logger, config)

	// Create middleware
	middleware := NewMiddleware(logger, config, authHandler)

	// Create handler
	handler := NewHandler(service, logger)

	return &Server{
		handler:    handler,
		middleware: middleware,
		service:    service,
		logger:     logger,
		config:     config,
	}
}

// RegisterRoutes registers the MCP routes with the given router
func (s *Server) RegisterRoutes(router *gin.Engine) {
	s.handler.RegisterRoutes(router, s.middleware)
}

// GetHandler returns the MCP handler
func (s *Server) GetHandler() *Handler {
	return s.handler
}

// GetMiddleware returns the MCP middleware
func (s *Server) GetMiddleware() *Middleware {
	return s.middleware
}

// GetService returns the MCP service
func (s *Server) GetService() Service {
	return s.service
}
