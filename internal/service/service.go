package service

import (
	"context"
	"fmt" // For error formatting
	"strings"

	"github.com/canonical/gomaasclient/entity"
	"github.com/lspecian/maas-mcp-server/internal/maas"
	"github.com/lspecian/maas-mcp-server/pkg/mcp"
)

// MCPService encapsulates the business logic for MCP tools.
type MCPService struct {
	maasClient *maas.ClientWrapper
	// logger
}

// NewMCPService creates a new MCPService instance.
func NewMCPService(maasClient *maas.ClientWrapper /*, logger */) *MCPService {
	return &MCPService{maasClient: maasClient}
}

// --- Helper function for mapping MAAS status ---
func mapMAASStatus(maasStatusCode int) string {
	// Based on potential MAAS status codes/enums - needs verification
	// against actual gomaasclient/MAAS API definitions
	switch maasStatusCode {
	case 0:
		return "New"
	case 1:
		return "Commissioning"
	case 2:
		return "Failed Commissioning"
	case 3:
		return "Missing/Lost"
	case 4:
		return "Ready"
	case 5:
		return "Reserved" // Might be internal state
	case 6:
		return "Allocated"
	case 7:
		return "Deploying"
	case 8:
		return "Deployed"
	case 9:
		return "Retiring"
	case 10:
		return "Failed Deployment"
	case 11:
		return "Releasing"
	case 12:
		return "Failed Releasing"
	case 13:
		return "Disk Erasing"
	case 14:
		return "Failed Disk Erasing"
	// Add other known statuses
	default:
		return fmt.Sprintf("Unknown (%d)", maasStatusCode)
	}
}

// --- Machine Management Tooling ---

// ListMachines implements the logic for the maas_list_machines tool.
func (s *MCPService) ListMachines(ctx context.Context, req mcp.ListMachinesRequest) ([]mcp.MachineSummary, error) {
	// Map MCP request params to gomaasclient params
	// Ref: gomaasclient/entity/machine.go - MachineParams
	maasParams := &entity.MachinesParams{
		Tags: req.Tags, // Already []string in mcp.ListMachinesRequest
	}
	if req.Hostname != "" {
		maasParams.Hostname = []string{req.Hostname}
	}
	if req.Zone != "" {
		maasParams.Zone = []string{req.Zone}
	}
	// Note: gomaasclient MachineParams uses Hostname []string, Zone []string, Tags []string

	maasMachines, err := s.maasClient.ListMachines(maasParams)
	if err != nil {
		return nil, err // Error already wrapped by client wrapper
	}

	// Map entity.Machine to mcp.MachineSummary
	mcpSummaries := make([]mcp.MachineSummary, 0, len(maasMachines))
	for _, m := range maasMachines {
		// Apply status filter locally if needed
		// entity.Machine.Status is node.Status (alias for int)
		if req.Status != "" && !strings.EqualFold(mapMAASStatus(int(m.Status)), req.Status) {
			continue
		}
		summary := mcp.MachineSummary{
			SystemID:   m.SystemID,
			Hostname:   m.Hostname,
			FQDN:       m.FQDN,
			Status:     mapMAASStatus(int(m.Status)),
			Zone:       m.Zone.Name,
			Pool:       m.Pool.Name,
			Tags:       m.TagNames,
			PowerState: m.PowerState,
		}
		mcpSummaries = append(mcpSummaries, summary)
	}

	return mcpSummaries, nil
}

// GetMachineDetails implements the logic for maas_get_machine_details.
func (s *MCPService) GetMachineDetails(ctx context.Context, systemID string) (*mcp.MachineDetails, error) {
	m, err := s.maasClient.GetMachine(systemID)
	if err != nil {
		// Handle specific errors, e.g., Not Found
		return nil, err
	}

	// Map entity.Machine to mcp.MachineDetails (more comprehensive mapping)
	details := &mcp.MachineDetails{
		SystemID:     m.SystemID,
		Hostname:     m.Hostname,
		FQDN:         m.FQDN,
		Status:       mapMAASStatus(int(m.Status)),
		Zone:         m.Zone.Name,
		Pool:         m.Pool.Name,
		Tags:         m.TagNames,
		PowerState:   m.PowerState,
		CPUCount:     m.CPUCount,
		MemoryMB:     m.Memory, // m.Memory is int64, mcp.MachineDetails.MemoryMB is int64
		Architecture: m.Architecture,
		OSSystem:     m.OSystem,
		DistroSeries: m.DistroSeries,
	}

	// Convert IPAddresses from []net.IP to []string
	if m.IPAddresses != nil {
		details.IPAddresses = make([]string, len(m.IPAddresses))
		for i, ip := range m.IPAddresses {
			details.IPAddresses[i] = ip.String()
		}
	}

	// Fetch and map interfaces
	interfaces, err := s.getMachineInterfaces(ctx, systemID)
	if err != nil {
		// Log error but potentially continue, or return partial data? Design choice for now: log and continue
		fmt.Printf("Warning: failed to get interfaces for %s: %v\n", systemID, err)
	} else {
		details.NetworkInterfaces = interfaces
	}

	// Fetch and map block devices
	blockDevices, err := s.getMachineBlockDevices(ctx, systemID)
	if err != nil {
		fmt.Printf("Warning: failed to get block devices for %s: %v\n", systemID, err)
	} else {
		details.BlockDevices = blockDevices
	}

	return details, nil
}

// GetMachinePowerState implements logic for maas_get_machine_power_state.
func (s *MCPService) GetMachinePowerState(ctx context.Context, systemID string) (string, error) {
	machine, err := s.maasClient.GetMachine(systemID)
	if err != nil {
		return "", err
	}
	return machine.PowerState, nil
}

// PowerOnMachine implements logic for maas_power_on_machine.
func (s *MCPService) PowerOnMachine(ctx context.Context, systemID string) (*mcp.MachineSummary, error) {
	machine, err := s.maasClient.PowerOnMachine(systemID)
	if err != nil {
		return nil, err
	}

	summary := &mcp.MachineSummary{
		SystemID:   machine.SystemID,
		Hostname:   machine.Hostname,
		FQDN:       machine.FQDN,
		Status:     mapMAASStatus(int(machine.Status)),
		Zone:       machine.Zone.Name,
		Pool:       machine.Pool.Name,
		Tags:       machine.TagNames,
		PowerState: machine.PowerState,
	}

	return summary, nil
}

// PowerOffMachine implements logic for maas_power_off_machine.
func (s *MCPService) PowerOffMachine(ctx context.Context, systemID string) (*mcp.MachineSummary, error) {
	machine, err := s.maasClient.PowerOffMachine(systemID)
	if err != nil {
		return nil, err
	}

	summary := &mcp.MachineSummary{
		SystemID:   machine.SystemID,
		Hostname:   machine.Hostname,
		FQDN:       machine.FQDN,
		Status:     mapMAASStatus(int(machine.Status)),
		Zone:       machine.Zone.Name,
		Pool:       machine.Pool.Name,
		Tags:       machine.TagNames,
		PowerState: machine.PowerState,
	}

	return summary, nil
}

// AllocateMachine implements logic for maas_allocate_machine.
func (s *MCPService) AllocateMachine(ctx context.Context, req mcp.AllocateMachineRequest) (*mcp.MachineSummary, error) {
	// Ref: gomaasclient/entity/machine.go - MachineAllocateParams
	maasParams := &entity.MachineAllocateParams{
		Tags:     req.Tags,
		Zone:     req.Zone, // Zone is string in MachineAllocateParams
		Pool:     req.Pool,
		Arch:     req.Architecture,
		CPUCount: req.MinCPUCount,      // Correct field name for min_cpu_count
		Mem:      int64(req.MinMemory), // Correct field name for min_memory, cast to int64
		// Hostname is not a direct parameter for allocation by constraints
	}
	// Add hostname to params if provided, though it's not a primary filter for allocation usually
	if req.Hostname != "" {
		// Note: MachineAllocateParams doesn't have a direct Hostname field for filtering.
		// Hostname is typically assigned *after* allocation or during deployment.
		// If specific hostname allocation is needed, it might be a MAAS feature not directly in these params
		// or would require a different workflow (e.g. reserve then update).
		// For now, we pass what's available in MachineAllocateParams.
	}

	allocatedMachine, err := s.maasClient.AllocateMachine(maasParams)
	if err != nil {
		return nil, err
	}

	summary := mcp.MachineSummary{
		SystemID:   allocatedMachine.SystemID,
		Hostname:   allocatedMachine.Hostname,
		FQDN:       allocatedMachine.FQDN,
		Status:     mapMAASStatus(int(allocatedMachine.Status)),
		Zone:       allocatedMachine.Zone.Name,
		Pool:       allocatedMachine.Pool.Name,
		Tags:       allocatedMachine.TagNames,
		PowerState: allocatedMachine.PowerState,
	}
	return &summary, nil
}

// DeployMachine implements logic for maas_deploy_machine.
func (s *MCPService) DeployMachine(ctx context.Context, req mcp.DeployMachineRequest) (*mcp.MachineSummary, error) {
	maasParams := &entity.MachineDeployParams{
		DistroSeries: req.DistroSeries,
		UserData:     req.UserData,
		HWEKernel:    req.HWEKernel,
	}

	deployedMachine, err := s.maasClient.DeployMachine(req.SystemID, maasParams)
	if err != nil {
		return nil, err
	}

	summary := mcp.MachineSummary{
		SystemID:   deployedMachine.SystemID,
		Hostname:   deployedMachine.Hostname,
		FQDN:       deployedMachine.FQDN,
		Status:     mapMAASStatus(int(deployedMachine.Status)),
		Zone:       deployedMachine.Zone.Name,
		Pool:       deployedMachine.Pool.Name,
		Tags:       deployedMachine.TagNames,
		PowerState: deployedMachine.PowerState,
	}
	return &summary, nil
}

// ReleaseMachine implements logic for maas_release_machine.
func (s *MCPService) ReleaseMachine(ctx context.Context, req mcp.ReleaseMachineRequest) error {
	// gomaasclient expects a slice of system IDs
	err := s.maasClient.ReleaseMachine([]string{req.SystemID}, req.Comment)
	return err
}

// --- Network Context Tooling ---

// ListSubnets implements logic for maas_list_subnets.
func (s *MCPService) ListSubnets(ctx context.Context, req mcp.ListSubnetsRequest) ([]mcp.SubnetDetails, error) {
	maasSubnets, err := s.maasClient.ListSubnets()
	if err != nil {
		return nil, err
	}
	mcpSubnets := make([]mcp.SubnetDetails, 0, len(maasSubnets))
	for _, sub := range maasSubnets {
		// Ref: gomaasclient/entity/subnet.go - Subnet.VLAN is entity.VLAN; VLAN has FabricID, Fabric
		if req.FabricID != 0 && sub.VLAN.FabricID != req.FabricID {
			continue
		}

		var dnsServers []string
		if sub.DNSServers != nil {
			dnsServers = make([]string, len(sub.DNSServers))
			for i, ip := range sub.DNSServers {
				dnsServers[i] = ip.String()
			}
		}

		gatewayIP := ""
		if sub.GatewayIP != nil {
			gatewayIP = sub.GatewayIP.String()
		}

		details := mcp.SubnetDetails{
			ID:         sub.ID,
			CIDR:       sub.CIDR,
			Name:       sub.Name,
			Fabric:     sub.VLAN.Fabric, // Access Fabric name via VLAN
			VLAN:       sub.VLAN.Name,
			Space:      sub.Space,
			GatewayIP:  gatewayIP,
			DNSServers: dnsServers,
			Managed:    sub.Managed,
			// TODO: Fetch and map IP Ranges if needed via separate calls
			// ReservedRanges: mapIPRanges(sub.IPRanges, "reserved"),
			// DynamicRanges:  mapIPRanges(sub.IPRanges, "dynamic"),
		}
		mcpSubnets = append(mcpSubnets, details)
	}
	return mcpSubnets, nil
}

// GetSubnetDetails implements logic for maas_get_subnet_details.
// Note: gomaasclient.Subnet.Get(id) takes an int. If searching by CIDR, would need to ListSubnets and filter.
func (s *MCPService) GetSubnetDetails(ctx context.Context, subnetID int) (*mcp.SubnetDetails, error) {
	sub, err := s.maasClient.GetSubnet(subnetID)
	if err != nil {
		return nil, err
	}

	var dnsServers []string
	if sub.DNSServers != nil {
		dnsServers = make([]string, len(sub.DNSServers))
		for i, ip := range sub.DNSServers {
			dnsServers[i] = ip.String()
		}
	}

	gatewayIP := ""
	if sub.GatewayIP != nil {
		gatewayIP = sub.GatewayIP.String()
	}

	details := &mcp.SubnetDetails{
		ID:         sub.ID,
		CIDR:       sub.CIDR,
		Name:       sub.Name,
		Fabric:     sub.VLAN.Fabric, // Access Fabric name via VLAN
		VLAN:       sub.VLAN.Name,
		Space:      sub.Space,
		GatewayIP:  gatewayIP,
		DNSServers: dnsServers,
		Managed:    sub.Managed,
		// TODO: Fetch and map IP Ranges
	}
	return details, nil
}

// --- Storage Context Tooling ---

// getMachineBlockDevices is a helper to fetch and map block devices.
func (s *MCPService) getMachineBlockDevices(ctx context.Context, systemID string) ([]mcp.BlockDeviceInfo, error) {
	maasDevices, err := s.maasClient.GetMachineBlockDevices(systemID)
	if err != nil {
		return nil, fmt.Errorf("maas API error getting block devices for %s: %w", systemID, err)
	}

	mcpDevices := make([]mcp.BlockDeviceInfo, 0, len(maasDevices))
	for _, d := range maasDevices {
		info := mcp.BlockDeviceInfo{
			ID:         d.ID,
			Name:       d.Name,
			Type:       d.Type,
			Size:       int64(d.Size), // Cast to int64
			Path:       d.Path,
			Model:      d.Model,
			Serial:     d.Serial,
			Filesystem: d.Filesystem.FSType,     // Corrected to d.Filesystem
			MountPoint: d.Filesystem.MountPoint, // Corrected to d.Filesystem
		}
		// Check if FSType is empty to determine if Filesystem info is present
		if d.Filesystem.FSType == "" {
			info.Filesystem = ""
			info.MountPoint = ""
		}
		mcpDevices = append(mcpDevices, info)
	}
	return mcpDevices, nil
}

// --- Interface Context Tooling ---

// getMachineInterfaces is a helper to fetch and map network interfaces.
func (s *MCPService) getMachineInterfaces(ctx context.Context, systemID string) ([]mcp.InterfaceInfo, error) {
	maasInterfaces, err := s.maasClient.GetMachineInterfaces(systemID)
	if err != nil {
		return nil, fmt.Errorf("maas API error getting interfaces for %s: %w", systemID, err)
	}

	mcpInterfaces := make([]mcp.InterfaceInfo, 0, len(maasInterfaces))
	for _, i := range maasInterfaces {
		links := make([]mcp.LinkInfo, 0, len(i.Links))
		for _, l := range i.Links {
			linkInfo := mcp.LinkInfo{
				ID:         l.ID,
				Mode:       l.Mode,
				SubnetCIDR: l.Subnet.CIDR,
			}
			if l.IPAddress != "" { // IPAddress is string, check if not empty
				linkInfo.IPAddress = l.IPAddress // Directly assign, it's already a string
			}
			links = append(links, linkInfo)
		}

		info := mcp.InterfaceInfo{
			ID:         i.ID,
			Name:       i.Name,
			Type:       i.Type,
			MACAddress: i.MACAddress,
			Links:      links,
		}
		mcpInterfaces = append(mcpInterfaces, info)
	}
	return mcpInterfaces, nil
}

// --- Add other service functions for remaining MCP tools ---
