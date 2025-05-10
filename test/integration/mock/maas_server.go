package mock

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"

	"github.com/canonical/gomaasclient/entity"
	"github.com/sirupsen/logrus"
)

// MockMAASServer is a mock implementation of the MAAS API server for testing.
type MockMAASServer struct {
	Server     *httptest.Server
	machines   map[string]*entity.Machine
	subnets    map[int]*entity.Subnet
	vlans      map[int][]entity.VLAN
	tags       map[string]*entity.Tag
	mutex      sync.RWMutex
	logger     *logrus.Logger
	apiVersion string
}

// NewMockMAASServer creates a new mock MAAS API server.
func NewMockMAASServer(logger *logrus.Logger) *MockMAASServer {
	if logger == nil {
		logger = logrus.New()
		logger.SetLevel(logrus.ErrorLevel)
	}

	mock := &MockMAASServer{
		machines:   make(map[string]*entity.Machine),
		subnets:    make(map[int]*entity.Subnet),
		vlans:      make(map[int][]entity.VLAN),
		tags:       make(map[string]*entity.Tag),
		logger:     logger,
		apiVersion: "2.0",
	}

	// Initialize with test data
	mock.initTestData()

	// Create HTTP server
	server := httptest.NewServer(http.HandlerFunc(mock.handleRequest))
	mock.Server = server

	return mock
}

// Close closes the mock MAAS server.
func (m *MockMAASServer) Close() {
	m.Server.Close()
}

// GetURL returns the URL of the mock MAAS server.
func (m *MockMAASServer) GetURL() string {
	return m.Server.URL
}

// GetAPIKey returns a mock API key for the MAAS server.
func (m *MockMAASServer) GetAPIKey() string {
	return "test:test:test"
}

// initTestData initializes the mock server with test data.
func (m *MockMAASServer) initTestData() {
	// Add test machines
	m.machines["abc123"] = &entity.Machine{
		SystemID:     "abc123",
		Hostname:     "test-machine-1",
		FQDN:         "test-machine-1.maas",
		Status:       4, // Ready
		Architecture: "amd64/generic",
		CPUCount:     4,
		Memory:       8192,
		PowerState:   "off",
		Zone: entity.Zone{
			ID:   1,
			Name: "default",
		},
		Pool: entity.ResourcePool{
			ID:   1,
			Name: "default",
		},
		TagNames: []string{"test", "virtual"},
	}

	m.machines["def456"] = &entity.Machine{
		SystemID:     "def456",
		Hostname:     "test-machine-2",
		FQDN:         "test-machine-2.maas",
		Status:       8, // Deployed
		Architecture: "amd64/generic",
		CPUCount:     8,
		Memory:       16384,
		PowerState:   "on",
		Zone: entity.Zone{
			ID:   1,
			Name: "default",
		},
		Pool: entity.ResourcePool{
			ID:   1,
			Name: "default",
		},
		TagNames: []string{"test", "physical"},
	}

	// Add test subnets
	m.subnets[1] = &entity.Subnet{
		ID:   1,
		CIDR: "192.168.1.0/24",
		Name: "test-subnet-1",
		VLAN: entity.VLAN{
			ID:     1,
			Name:   "default",
			VID:    1,
			Fabric: "1",
		},
		Space:   "default",
		Managed: true,
	}

	m.subnets[2] = &entity.Subnet{
		ID:   2,
		CIDR: "10.0.0.0/24",
		Name: "test-subnet-2",
		VLAN: entity.VLAN{
			ID:     2,
			Name:   "vlan-10",
			VID:    10,
			Fabric: "1",
		},
		Space:   "default",
		Managed: true,
	}

	// Add test VLANs
	m.vlans[1] = []entity.VLAN{
		{
			ID:     1,
			Name:   "default",
			VID:    1,
			Fabric: "1",
		},
		{
			ID:     2,
			Name:   "vlan-10",
			VID:    10,
			Fabric: "1",
		},
	}

	// Add test tags
	m.tags["test"] = &entity.Tag{
		Name:    "test",
		Comment: "Test tag",
	}

	m.tags["virtual"] = &entity.Tag{
		Name:    "virtual",
		Comment: "Virtual machine",
	}

	m.tags["physical"] = &entity.Tag{
		Name:    "physical",
		Comment: "Physical machine",
	}
}

// handleRequest handles HTTP requests to the mock MAAS API server.
func (m *MockMAASServer) handleRequest(w http.ResponseWriter, r *http.Request) {
	m.logger.WithFields(logrus.Fields{
		"method": r.Method,
		"path":   r.URL.Path,
		"query":  r.URL.RawQuery,
	}).Debug("Received request")

	// Parse API version from URL
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 || pathParts[1] != "MAAS" || pathParts[2] != "api" {
		http.Error(w, "Invalid API path", http.StatusNotFound)
		return
	}

	// Extract the resource path (e.g., "machines", "subnets", etc.)
	resourcePath := strings.Join(pathParts[4:], "/")

	// Handle different API endpoints
	switch {
	case strings.HasPrefix(resourcePath, "machines"):
		m.handleMachinesEndpoint(w, r, resourcePath)
	case strings.HasPrefix(resourcePath, "subnets"):
		m.handleSubnetsEndpoint(w, r, resourcePath)
	case strings.HasPrefix(resourcePath, "vlans"):
		m.handleVLANsEndpoint(w, r, resourcePath)
	case strings.HasPrefix(resourcePath, "tags"):
		m.handleTagsEndpoint(w, r, resourcePath)
	default:
		http.Error(w, fmt.Sprintf("Unsupported endpoint: %s", resourcePath), http.StatusNotFound)
	}
}

// handleMachinesEndpoint handles requests to the machines endpoint.
func (m *MockMAASServer) handleMachinesEndpoint(w http.ResponseWriter, r *http.Request, path string) {
	pathParts := strings.Split(path, "/")

	// Handle different machine operations
	switch {
	case len(pathParts) == 1 && r.Method == http.MethodGet:
		// List machines
		m.listMachines(w, r)
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodGet:
		// Get machine details
		m.getMachine(w, r, pathParts[1])
	case len(pathParts) == 1 && r.Method == http.MethodPost && r.FormValue("op") == "allocate":
		// Allocate machine
		m.allocateMachine(w, r)
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodPost && r.FormValue("op") == "deploy":
		// Deploy machine
		m.deployMachine(w, r, pathParts[1])
	case len(pathParts) == 1 && r.Method == http.MethodPost && r.FormValue("op") == "release":
		// Release machine
		m.releaseMachine(w, r)
	default:
		http.Error(w, "Unsupported machine operation", http.StatusNotFound)
	}
}

// handleSubnetsEndpoint handles requests to the subnets endpoint.
func (m *MockMAASServer) handleSubnetsEndpoint(w http.ResponseWriter, r *http.Request, path string) {
	pathParts := strings.Split(path, "/")

	// Handle different subnet operations
	switch {
	case len(pathParts) == 1 && r.Method == http.MethodGet:
		// List subnets
		m.listSubnets(w, r)
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodGet:
		// Get subnet details
		subnetID := 0
		fmt.Sscanf(pathParts[1], "%d", &subnetID)
		m.getSubnet(w, r, subnetID)
	default:
		http.Error(w, "Unsupported subnet operation", http.StatusNotFound)
	}
}

// handleVLANsEndpoint handles requests to the VLANs endpoint.
func (m *MockMAASServer) handleVLANsEndpoint(w http.ResponseWriter, r *http.Request, path string) {
	pathParts := strings.Split(path, "/")

	// Handle different VLAN operations
	switch {
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodGet:
		// List VLANs for fabric
		fabricID := 0
		fmt.Sscanf(pathParts[1], "%d", &fabricID)
		m.listVLANs(w, r, fabricID)
	default:
		http.Error(w, "Unsupported VLAN operation", http.StatusNotFound)
	}
}

// handleTagsEndpoint handles requests to the tags endpoint.
func (m *MockMAASServer) handleTagsEndpoint(w http.ResponseWriter, r *http.Request, path string) {
	pathParts := strings.Split(path, "/")

	// Handle different tag operations
	switch {
	case len(pathParts) == 1 && r.Method == http.MethodGet:
		// List tags
		m.listTags(w, r)
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodGet:
		// Get tag details
		m.getTag(w, r, pathParts[1])
	case len(pathParts) == 1 && r.Method == http.MethodPost:
		// Create tag
		m.createTag(w, r)
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodPost && r.FormValue("op") == "machines":
		// Add tag to machines
		m.addTagToMachines(w, r, pathParts[1])
	case len(pathParts) >= 2 && pathParts[1] != "" && r.Method == http.MethodPost && r.FormValue("op") == "unmachines":
		// Remove tag from machines
		m.removeTagFromMachines(w, r, pathParts[1])
	default:
		http.Error(w, "Unsupported tag operation", http.StatusNotFound)
	}
}

// listMachines handles listing machines.
func (m *MockMAASServer) listMachines(w http.ResponseWriter, r *http.Request) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// Get query parameters for filtering
	hostname := r.FormValue("hostname")
	zone := r.FormValue("zone")
	pool := r.FormValue("pool")
	tags := r.FormValue("tags")

	var result []entity.Machine
	for _, machine := range m.machines {
		// Apply filters
		if hostname != "" && machine.Hostname != hostname {
			continue
		}
		if zone != "" && machine.Zone.Name != zone {
			continue
		}
		if pool != "" && machine.Pool.Name != pool {
			continue
		}
		if tags != "" {
			tagList := strings.Split(tags, ",")
			matches := true
			for _, tag := range tagList {
				found := false
				for _, machineTag := range machine.TagNames {
					if machineTag == tag {
						found = true
						break
					}
				}
				if !found {
					matches = false
					break
				}
			}
			if !matches {
				continue
			}
		}

		// Add machine to result
		result = append(result, *machine)
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// getMachine handles getting a specific machine.
func (m *MockMAASServer) getMachine(w http.ResponseWriter, r *http.Request, systemID string) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	machine, ok := m.machines[systemID]
	if !ok {
		http.Error(w, fmt.Sprintf("Machine not found: %s", systemID), http.StatusNotFound)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(machine)
}

// allocateMachine handles allocating a machine.
func (m *MockMAASServer) allocateMachine(w http.ResponseWriter, r *http.Request) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Parse constraints
	cpuCount := 0
	if r.FormValue("cpu_count") != "" {
		fmt.Sscanf(r.FormValue("cpu_count"), "%d", &cpuCount)
	}

	memory := int64(0)
	if r.FormValue("mem") != "" {
		fmt.Sscanf(r.FormValue("mem"), "%d", &memory)
	}

	tags := []string{}
	if r.FormValue("tags") != "" {
		tags = strings.Split(r.FormValue("tags"), ",")
	}

	zone := r.FormValue("zone")
	pool := r.FormValue("pool")
	arch := r.FormValue("arch")

	// Find a machine that matches the constraints
	for _, machine := range m.machines {
		if machine.Status != 4 { // Ready
			continue
		}

		// Check constraints
		if cpuCount > 0 && machine.CPUCount < cpuCount {
			continue
		}
		if memory > 0 && machine.Memory < memory {
			continue
		}
		if len(tags) > 0 {
			matches := true
			for _, tag := range tags {
				found := false
				for _, machineTag := range machine.TagNames {
					if machineTag == tag {
						found = true
						break
					}
				}
				if !found {
					matches = false
					break
				}
			}
			if !matches {
				continue
			}
		}
		if zone != "" && machine.Zone.Name != zone {
			continue
		}
		if pool != "" && machine.Pool.Name != pool {
			continue
		}
		if arch != "" && machine.Architecture != arch {
			continue
		}

		// Machine matches constraints, allocate it
		machine.Status = 6 // Allocated

		// Return JSON response
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(machine)
		return
	}

	// No machine found matching constraints
	http.Error(w, "No machine found matching constraints", http.StatusConflict)
}

// deployMachine handles deploying a machine.
func (m *MockMAASServer) deployMachine(w http.ResponseWriter, r *http.Request, systemID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	machine, ok := m.machines[systemID]
	if !ok {
		http.Error(w, fmt.Sprintf("Machine not found: %s", systemID), http.StatusNotFound)
		return
	}

	if machine.Status != 6 { // Allocated
		http.Error(w, fmt.Sprintf("Machine is not allocated: %s", systemID), http.StatusConflict)
		return
	}

	// Deploy the machine
	machine.Status = 7 // Deploying

	// Set distro series if provided
	distroSeries := r.FormValue("distro_series")
	if distroSeries != "" {
		// In the real implementation, this would set the operating system series
		// For the mock, we'll just log it
		m.logger.WithField("distro_series", distroSeries).Debug("Setting distro series")
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(machine)
}

// releaseMachine handles releasing a machine.
func (m *MockMAASServer) releaseMachine(w http.ResponseWriter, r *http.Request) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	// Parse system IDs
	systemIDs := []string{}
	if r.FormValue("system_id") != "" {
		systemIDs = strings.Split(r.FormValue("system_id"), ",")
	}

	if len(systemIDs) == 0 {
		http.Error(w, "No system IDs provided", http.StatusBadRequest)
		return
	}

	// Release each machine
	for _, systemID := range systemIDs {
		machine, ok := m.machines[systemID]
		if !ok {
			http.Error(w, fmt.Sprintf("Machine not found: %s", systemID), http.StatusNotFound)
			return
		}

		// Release the machine
		machine.Status = 4 // Ready
	}

	// Return success
	w.WriteHeader(http.StatusOK)
}

// listSubnets handles listing subnets.
func (m *MockMAASServer) listSubnets(w http.ResponseWriter, r *http.Request) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var result []entity.Subnet
	for _, subnet := range m.subnets {
		result = append(result, *subnet)
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// getSubnet handles getting a specific subnet.
func (m *MockMAASServer) getSubnet(w http.ResponseWriter, r *http.Request, id int) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	subnet, ok := m.subnets[id]
	if !ok {
		http.Error(w, fmt.Sprintf("Subnet not found: %d", id), http.StatusNotFound)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subnet)
}

// listVLANs handles listing VLANs for a fabric.
func (m *MockMAASServer) listVLANs(w http.ResponseWriter, r *http.Request, fabricID int) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	vlans, ok := m.vlans[fabricID]
	if !ok {
		// Return empty array if fabric not found
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]entity.VLAN{})
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vlans)
}

// listTags handles listing tags.
func (m *MockMAASServer) listTags(w http.ResponseWriter, r *http.Request) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var result []entity.Tag
	for _, tag := range m.tags {
		result = append(result, *tag)
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// getTag handles getting a specific tag.
func (m *MockMAASServer) getTag(w http.ResponseWriter, r *http.Request, name string) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	tag, ok := m.tags[name]
	if !ok {
		http.Error(w, fmt.Sprintf("Tag not found: %s", name), http.StatusNotFound)
		return
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

// createTag handles creating a new tag.
func (m *MockMAASServer) createTag(w http.ResponseWriter, r *http.Request) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	name := r.FormValue("name")
	if name == "" {
		http.Error(w, "Tag name is required", http.StatusBadRequest)
		return
	}

	if _, ok := m.tags[name]; ok {
		http.Error(w, fmt.Sprintf("Tag already exists: %s", name), http.StatusConflict)
		return
	}

	comment := r.FormValue("comment")
	definition := r.FormValue("definition")

	// Create the tag
	tag := &entity.Tag{
		Name: name,
	}

	if comment != "" {
		commentCopy := comment
		tag.Comment = commentCopy
	}

	if definition != "" {
		definitionCopy := definition
		tag.Definition = definitionCopy
	}

	m.tags[name] = tag

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

// addTagToMachines handles adding a tag to machines.
func (m *MockMAASServer) addTagToMachines(w http.ResponseWriter, r *http.Request, tagName string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	tag, ok := m.tags[tagName]
	if !ok {
		http.Error(w, fmt.Sprintf("Tag not found: %s", tagName), http.StatusNotFound)
		return
	}

	// Parse system IDs
	systemIDs := []string{}
	if r.FormValue("system_id") != "" {
		systemIDs = strings.Split(r.FormValue("system_id"), ",")
	}

	if len(systemIDs) == 0 {
		http.Error(w, "No system IDs provided", http.StatusBadRequest)
		return
	}

	// Add tag to each machine
	for _, systemID := range systemIDs {
		machine, ok := m.machines[systemID]
		if !ok {
			http.Error(w, fmt.Sprintf("Machine not found: %s", systemID), http.StatusNotFound)
			return
		}

		// Check if tag is already applied
		found := false
		for _, t := range machine.TagNames {
			if t == tagName {
				found = true
				break
			}
		}

		if !found {
			// Apply tag
			machine.TagNames = append(machine.TagNames, tagName)
		}
	}

	// Return JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

// removeTagFromMachines handles removing a tag from machines.
func (m *MockMAASServer) removeTagFromMachines(w http.ResponseWriter, r *http.Request, tagName string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	_, ok := m.tags[tagName]
	if !ok {
		http.Error(w, fmt.Sprintf("Tag not found: %s", tagName), http.StatusNotFound)
		return
	}

	// Parse system IDs
	systemIDs := []string{}
	if r.FormValue("system_id") != "" {
		systemIDs = strings.Split(r.FormValue("system_id"), ",")
	}

	if len(systemIDs) == 0 {
		http.Error(w, "No system IDs provided", http.StatusBadRequest)
		return
	}

	// Remove tag from each machine
	for _, systemID := range systemIDs {
		machine, ok := m.machines[systemID]
		if !ok {
			http.Error(w, fmt.Sprintf("Machine not found: %s", systemID), http.StatusNotFound)
			return
		}

		// Find and remove tag
		for i, t := range machine.TagNames {
			if t == tagName {
				machine.TagNames = append(machine.TagNames[:i], machine.TagNames[i+1:]...)
				break
			}
		}
	}

	// Return success
	w.WriteHeader(http.StatusOK)
}
