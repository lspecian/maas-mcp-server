package transport

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lspecian/maas-mcp-server/internal/models"
	"github.com/lspecian/maas-mcp-server/internal/service"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockNetworkService is a mock implementation of the NetworkServiceInterface
type MockNetworkService struct {
	mock.Mock
}

func (m *MockNetworkService) ListSubnets(ctx context.Context, filters map[string]string) ([]models.SubnetContext, error) {
	args := m.Called(ctx, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.SubnetContext), args.Error(1)
}

func (m *MockNetworkService) GetSubnetDetails(ctx context.Context, id int) (*models.SubnetContext, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.SubnetContext), args.Error(1)
}

func (m *MockNetworkService) ListVLANs(ctx context.Context, fabricID int) ([]models.VLANContext, error) {
	args := m.Called(ctx, fabricID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.VLANContext), args.Error(1)
}

func setupNetworkTest() (*gin.Engine, *MockNetworkService, *logrus.Logger) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	logger := logrus.New()
	logger.SetLevel(logrus.FatalLevel) // Suppress logs during tests

	mockService := new(MockNetworkService)
	handler := NewNetworkHandler(mockService, logger)

	api := router.Group("/api/v1")
	handler.RegisterRoutes(api)

	return router, mockService, logger
}

func TestListSubnets(t *testing.T) {
	router, mockService, _ := setupNetworkTest()

	// Test case 1: Successful subnet listing
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		mockSubnets := []models.SubnetContext{
			{
				ID:          "1",
				Name:        "subnet-1",
				CIDR:        "192.168.1.0/24",
				Fabric:      "fabric-1",
				VLAN:        "vlan-1",
				VLANTag:     1,
				Space:       "space-1",
				GatewayIP:   "192.168.1.1",
				DNSServers:  []string{"8.8.8.8"},
				Managed:     true,
				Active:      true,
				LastUpdated: time.Now(),
			},
			{
				ID:          "2",
				Name:        "subnet-2",
				CIDR:        "10.0.0.0/24",
				Fabric:      "fabric-2",
				VLAN:        "vlan-2",
				VLANTag:     2,
				Space:       "space-2",
				GatewayIP:   "10.0.0.1",
				DNSServers:  []string{"8.8.4.4"},
				Managed:     true,
				Active:      true,
				LastUpdated: time.Now(),
			},
		}

		mockService.On("ListSubnets", mock.Anything, mock.Anything).Return(mockSubnets, nil)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/subnets", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string][]models.SubnetContext
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Len(t, response["subnets"], 2)
		assert.Equal(t, "subnet-1", response["subnets"][0].Name)
		assert.Equal(t, "subnet-2", response["subnets"][1].Name)

		mockService.AssertExpectations(t)
	})

	// Test case 2: Service error
	t.Run("Service Error", func(t *testing.T) {
		// Reset mock
		mockService := new(MockNetworkService)
		handler := NewNetworkHandler(mockService, logrus.New())
		api := router.Group("/api/v1")
		handler.RegisterRoutes(api)

		// Setup mock
		serviceErr := &service.ServiceError{
			Err:        service.ErrServiceUnavailable,
			StatusCode: http.StatusServiceUnavailable,
			Message:    "MAAS API unavailable",
		}
		mockService.On("ListSubnets", mock.Anything, mock.Anything).Return(nil, serviceErr)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/subnets", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusServiceUnavailable, w.Code)

		mockService.AssertExpectations(t)
	})
}

func TestGetSubnetDetails(t *testing.T) {
	router, mockService, _ := setupNetworkTest()

	// Test case 1: Successful subnet retrieval
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		mockSubnet := &models.SubnetContext{
			ID:          "1",
			Name:        "subnet-1",
			CIDR:        "192.168.1.0/24",
			Fabric:      "fabric-1",
			VLAN:        "vlan-1",
			VLANTag:     1,
			Space:       "space-1",
			GatewayIP:   "192.168.1.1",
			DNSServers:  []string{"8.8.8.8"},
			Managed:     true,
			Active:      true,
			LastUpdated: time.Now(),
		}

		mockService.On("GetSubnetDetails", mock.Anything, 1).Return(mockSubnet, nil)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/subnets/1", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusOK, w.Code)

		var response models.SubnetContext
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "1", response.ID)
		assert.Equal(t, "subnet-1", response.Name)
		assert.Equal(t, "192.168.1.0/24", response.CIDR)

		mockService.AssertExpectations(t)
	})

	// Test case 2: Invalid ID format
	t.Run("Invalid ID Format", func(t *testing.T) {
		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/subnets/invalid", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	// Test case 3: Subnet not found
	t.Run("Not Found", func(t *testing.T) {
		// Reset mock
		mockService := new(MockNetworkService)
		handler := NewNetworkHandler(mockService, logrus.New())
		api := router.Group("/api/v1")
		handler.RegisterRoutes(api)

		// Setup mock
		serviceErr := &service.ServiceError{
			Err:        service.ErrNotFound,
			StatusCode: http.StatusNotFound,
			Message:    "Subnet not found",
		}
		mockService.On("GetSubnetDetails", mock.Anything, 999).Return(nil, serviceErr)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/subnets/999", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusNotFound, w.Code)

		mockService.AssertExpectations(t)
	})
}

func TestListVLANs(t *testing.T) {
	router, mockService, _ := setupNetworkTest()

	// Test case 1: Successful VLAN listing
	t.Run("Success", func(t *testing.T) {
		// Setup mock
		mockVLANs := []models.VLANContext{
			{
				ID:          "1",
				Name:        "vlan-1",
				VID:         1,
				MTU:         1500,
				Fabric:      "fabric-1",
				FabricID:    "1",
				DHCPEnabled: true,
				Primary:     true,
				LastUpdated: time.Now(),
			},
			{
				ID:          "2",
				Name:        "vlan-2",
				VID:         2,
				MTU:         1500,
				Fabric:      "fabric-1",
				FabricID:    "1",
				DHCPEnabled: false,
				Primary:     false,
				LastUpdated: time.Now(),
			},
		}

		mockService.On("ListVLANs", mock.Anything, 1).Return(mockVLANs, nil)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/vlans?fabric_id=1", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string][]models.VLANContext
		err := json.Unmarshal(w.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Len(t, response["vlans"], 2)
		assert.Equal(t, "vlan-1", response["vlans"][0].Name)
		assert.Equal(t, "vlan-2", response["vlans"][1].Name)

		mockService.AssertExpectations(t)
	})

	// Test case 2: Invalid fabric_id format
	t.Run("Invalid Fabric ID Format", func(t *testing.T) {
		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/vlans?fabric_id=invalid", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	// Test case 3: Service error
	t.Run("Service Error", func(t *testing.T) {
		// Reset mock
		mockService := new(MockNetworkService)
		handler := NewNetworkHandler(mockService, logrus.New())
		api := router.Group("/api/v1")
		handler.RegisterRoutes(api)

		// Setup mock
		serviceErr := errors.New("unexpected error")
		mockService.On("ListVLANs", mock.Anything, 2).Return(nil, serviceErr)

		// Create request
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/networks/vlans?fabric_id=2", nil)
		router.ServeHTTP(w, req)

		// Assert response
		assert.Equal(t, http.StatusInternalServerError, w.Code)

		mockService.AssertExpectations(t)
	})
}
