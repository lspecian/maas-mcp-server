package tools

import (
	"github.com/lspecian/maas-mcp-server/internal/models"
)

// ToolSchemas defines the schemas for all tools
var ToolSchemas = map[string]ToolSchema{
	// Machine Management Tools
	"maas_list_machines": {
		Name:        "maas_list_machines",
		Description: "List all machines managed by MAAS",
		InputSchema: models.ListMachinesRequest{},
	},
	"maas_get_machine_details": {
		Name:        "maas_get_machine_details",
		Description: "Get detailed information about a specific machine",
		InputSchema: models.GetMachineDetailsRequest{},
	},
	"maas_allocate_machine": {
		Name:        "maas_allocate_machine",
		Description: "Allocate a machine based on constraints",
		InputSchema: models.AllocateMachineRequest{},
	},
	"maas_deploy_machine": {
		Name:        "maas_deploy_machine",
		Description: "Deploy an operating system to a machine",
		InputSchema: models.DeployMachineRequest{},
	},
	"maas_release_machine": {
		Name:        "maas_release_machine",
		Description: "Release a machine back to the pool",
		InputSchema: models.ReleaseMachineRequest{},
	},
	"maas_get_machine_power_state": {
		Name:        "maas_get_machine_power_state",
		Description: "Get the power state of a machine",
		InputSchema: models.GetMachinePowerStateRequest{},
	},
	"maas_power_on_machine": {
		Name:        "maas_power_on_machine",
		Description: "Power on a machine",
		InputSchema: models.PowerOnMachineRequest{},
	},
	"maas_power_off_machine": {
		Name:        "maas_power_off_machine",
		Description: "Power off a machine",
		InputSchema: models.PowerOffMachineRequest{},
	},

	// Network Management Tools
	"maas_list_subnets": {
		Name:        "maas_list_subnets",
		Description: "List all subnets",
		InputSchema: models.ListSubnetsRequest{},
	},
	"maas_get_subnet_details": {
		Name:        "maas_get_subnet_details",
		Description: "Get detailed information about a specific subnet",
		InputSchema: models.GetSubnetDetailsRequest{},
	},

	// Tag Management Tools
	"maas_list_tags": {
		Name:        "maas_list_tags",
		Description: "List all tags",
		InputSchema: struct {
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_create_tag": {
		Name:        "maas_create_tag",
		Description: "Create a new tag",
		InputSchema: struct {
			Name        string             `json:"name" validate:"required"`
			Description string             `json:"description,omitempty"`
			MaasConfig  *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_delete_tag": {
		Name:        "maas_delete_tag",
		Description: "Delete a tag",
		InputSchema: struct {
			Name       string             `json:"name" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_add_tag_to_machine": {
		Name:        "maas_add_tag_to_machine",
		Description: "Add a tag to a machine",
		InputSchema: struct {
			SystemID   string             `json:"system_id" validate:"required"`
			Tag        string             `json:"tag" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_remove_tag_from_machine": {
		Name:        "maas_remove_tag_from_machine",
		Description: "Remove a tag from a machine",
		InputSchema: struct {
			SystemID   string             `json:"system_id" validate:"required"`
			Tag        string             `json:"tag" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},

	// Storage Management Tools
	"maas_list_storage_layouts": {
		Name:        "maas_list_storage_layouts",
		Description: "List available storage layouts for a machine",
		InputSchema: struct {
			SystemID   string             `json:"system_id" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_apply_storage_layout": {
		Name:        "maas_apply_storage_layout",
		Description: "Apply a storage layout to a machine",
		InputSchema: struct {
			SystemID   string             `json:"system_id" validate:"required"`
			Layout     string             `json:"layout" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},

	// Script Management Tools
	"maas_upload_script": {
		Name:        "maas_upload_script",
		Description: "Upload a script to MAAS",
		InputSchema: struct {
			Name       string             `json:"name" validate:"required"`
			Content    string             `json:"content" validate:"required"`
			Type       string             `json:"type" validate:"required,oneof=commissioning testing"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
	"maas_delete_script": {
		Name:        "maas_delete_script",
		Description: "Delete a script from MAAS",
		InputSchema: struct {
			Name       string             `json:"name" validate:"required"`
			MaasConfig *models.MaasConfig `json:"_maasConfig,omitempty"`
		}{},
	},
}
