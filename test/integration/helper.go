package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/config"
	"github.com/lspecian/maas-mcp-server/internal/logging"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/lspecian/maas-mcp-server/internal/transport"
	"github.com/lspecian/maas-mcp-server/test/integration/mock"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

// TestServer represents a test server for integration tests.
type TestServer struct {
	Server     *httptest.Server
	Router     *gin.Engine
	MockClient *mock.MockMaasClient
	Logger     *logrus.Logger
}

// NewTestServer creates a new test server with a mock MAAS client.
func NewTestServer(t *testing.T) *TestServer {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test configuration
	cfg := &config.Config{}
	cfg.Server.Host = "localhost"
	cfg.Server.Port = 8080

	// Initialize MAAS instances map
	cfg.MAASInstances = make(map[string]config.MAASInstanceConfig)

	// Add a default MAAS instance for testing
	cfg.MAASInstances["default"] = config.MAASInstanceConfig{
		APIURL: "http://localhost:5240/MAAS/api/2.0",
		APIKey: "test:test:test",
	}

	cfg.Auth.Enabled = false
	cfg.Logging.Level = "error"

	// Create a logger
	logger := logging.NewLogger(cfg.Logging.Level)

	// Create a mock MAAS client
	mockClient := mock.NewMockMaasClient(logger)

	// Initialize services
	machineService := service.NewMachineService(mockClient, logger)
	networkService := service.NewNetworkService(mockClient, logger)
	storageService := service.NewStorageService(mockClient, logger)
	tagService := service.NewTagService(mockClient, logger)

	// Initialize HTTP handlers
	machineHandler := transport.NewMachineHandler(machineService, logger)
	networkHandler := transport.NewNetworkHandler(networkService, logger)
	storageHandler := transport.NewStorageHandler(storageService, logger)
	tagHandler := transport.NewTagHandler(tagService, logger)

	// Set up Gin router
	router := gin.New()
	router.Use(gin.Recovery())

	// Register routes
	apiGroup := router.Group("/api/v1")
	machineHandler.RegisterRoutes(apiGroup)
	networkHandler.RegisterRoutes(apiGroup)
	storageHandler.RegisterRoutes(apiGroup)
	tagHandler.RegisterRoutes(apiGroup)

	// Create a test HTTP server
	server := httptest.NewServer(router)

	return &TestServer{
		Server:     server,
		Router:     router,
		MockClient: mockClient,
		Logger:     logger,
	}
}

// Close closes the test server.
func (ts *TestServer) Close() {
	ts.Server.Close()
}

// MakeRequest makes an HTTP request to the test server.
func (ts *TestServer) MakeRequest(t *testing.T, method, path string, body interface{}) (*http.Response, []byte) {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewBuffer(jsonBody)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, err := http.NewRequest(method, ts.Server.URL+path, reqBody)
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	require.NoError(t, err)

	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	return resp, respBody
}

// ParseJSONResponse parses a JSON response into the given target.
func ParseJSONResponse(t *testing.T, respBody []byte, target interface{}) {
	err := json.Unmarshal(respBody, target)
	require.NoError(t, err, fmt.Sprintf("Failed to parse JSON response: %s", string(respBody)))
}
