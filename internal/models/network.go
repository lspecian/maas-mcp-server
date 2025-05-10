package models

import (
	"fmt"
	"time"
)

// SubnetContext represents a subnet in the MCP context
type SubnetContext struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	CIDR        string            `json:"cidr"`
	Fabric      string            `json:"fabric"`
	VLAN        string            `json:"vlan"`
	VLANTag     int               `json:"vlan_tag,omitempty"`
	Space       string            `json:"space"`
	GatewayIP   string            `json:"gateway_ip,omitempty"`
	DNSServers  []string          `json:"dns_servers,omitempty"`
	Managed     bool              `json:"managed"`
	Active      bool              `json:"active"`
	IPRanges    []IPRangeContext  `json:"ip_ranges,omitempty"`
	LastUpdated time.Time         `json:"last_updated"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// Validate checks if the SubnetContext has all required fields
func (s *SubnetContext) Validate() error {
	if s.ID == "" {
		return fmt.Errorf("subnet id is required")
	}
	if s.CIDR == "" {
		return fmt.Errorf("subnet CIDR is required")
	}
	return nil
}

// VLANContext represents a VLAN in the MCP context
type VLANContext struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	VID         int               `json:"vid"`
	MTU         int               `json:"mtu"`
	Fabric      string            `json:"fabric"`
	FabricID    string            `json:"fabric_id"`
	DHCPEnabled bool              `json:"dhcp_enabled"`
	Primary     bool              `json:"primary"`
	LastUpdated time.Time         `json:"last_updated"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// Validate checks if the VLANContext has all required fields
func (v *VLANContext) Validate() error {
	if v.ID == "" {
		return fmt.Errorf("VLAN id is required")
	}
	if v.Fabric == "" {
		return fmt.Errorf("VLAN fabric is required")
	}
	return nil
}

// IPRangeContext represents an IP range in the MCP context
type IPRangeContext struct {
	Type    string `json:"type"` // reserved, dynamic
	StartIP string `json:"start_ip"`
	EndIP   string `json:"end_ip"`
	Comment string `json:"comment,omitempty"`
}

// MaasSubnetToMCPContext converts a MAAS Subnet to an MCP SubnetContext
func MaasSubnetToMCPContext(subnet *Subnet) *SubnetContext {
	ctx := &SubnetContext{
		ID:          idToString(subnet.ID),
		Name:        subnet.Name,
		CIDR:        subnet.CIDR,
		Space:       subnet.Space,
		GatewayIP:   subnet.GatewayIP,
		DNSServers:  subnet.DNSServers,
		Managed:     subnet.Managed,
		Active:      subnet.Active,
		LastUpdated: time.Now(),
	}

	// Set VLAN info if available
	if subnet.VLAN != nil {
		ctx.VLAN = subnet.VLAN.Name
		ctx.VLANTag = subnet.VLAN.VID
		ctx.Fabric = subnet.FabricName
	}

	// Set metadata if available
	if subnet.Description != "" {
		ctx.Metadata = map[string]string{
			"description": subnet.Description,
		}
	}

	return ctx
}

// MaasVLANToMCPContext converts a MAAS VLAN to an MCP VLANContext
func MaasVLANToMCPContext(vlan *VLAN) *VLANContext {
	ctx := &VLANContext{
		ID:          idToString(vlan.ID),
		Name:        vlan.Name,
		VID:         vlan.VID,
		MTU:         vlan.MTU,
		FabricID:    idToString(vlan.FabricID),
		Fabric:      vlan.FabricName,
		DHCPEnabled: vlan.DHCPOn,
		Primary:     vlan.Primary,
		LastUpdated: time.Now(),
	}

	// Set metadata if available
	if vlan.Description != "" {
		ctx.Metadata = map[string]string{
			"description": vlan.Description,
		}
	}

	return ctx
}

// MCPContextToMaasSubnet converts an MCP SubnetContext to a MAAS Subnet
func MCPContextToMaasSubnet(ctx *SubnetContext) *Subnet {
	subnet := &Subnet{
		Name:       ctx.Name,
		CIDR:       ctx.CIDR,
		Space:      ctx.Space,
		GatewayIP:  ctx.GatewayIP,
		DNSServers: ctx.DNSServers,
		Managed:    ctx.Managed,
		Active:     ctx.Active,
		FabricName: ctx.Fabric,
	}

	// Set VLAN if available
	if ctx.VLAN != "" {
		subnet.VLAN = &VLAN{
			Name: ctx.VLAN,
			VID:  ctx.VLANTag,
		}
	}

	// Set description if available
	if ctx.Metadata != nil {
		if desc, ok := ctx.Metadata["description"]; ok {
			subnet.Description = desc
		}
	}

	return subnet
}

// MCPContextToMaasVLAN converts an MCP VLANContext to a MAAS VLAN
func MCPContextToMaasVLAN(ctx *VLANContext) *VLAN {
	vlan := &VLAN{
		Name:       ctx.Name,
		VID:        ctx.VID,
		MTU:        ctx.MTU,
		FabricName: ctx.Fabric,
		DHCPOn:     ctx.DHCPEnabled,
		Primary:    ctx.Primary,
	}

	// Set description if available
	if ctx.Metadata != nil {
		if desc, ok := ctx.Metadata["description"]; ok {
			vlan.Description = desc
		}
	}

	return vlan
}
