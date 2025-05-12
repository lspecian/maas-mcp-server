// src/mcp_tools/index.ts
const path = require('path');

// Import MCP SDK modules using direct paths
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));

const { MaasApiClient } = require("../maas/MaasApiClient");
const { registerListMachinesTool } = require("./listMachines");
const { registerDeployMachineTool } = require("./deployMachine");
const { registerTagManagementTools } = require("./tagManagement");
const { registerAllocateMachineTool } = require("./allocateMachine");
const { registerCreateMachineTool } = require("./createMachine");
const { registerCreateDeviceTool } = require("./createDevice");
const { registerCreateNetworkTool } = require("./createNetwork");
const { registerDeleteMachineTool } = require("./deleteMachine");
const { registerDeleteDeviceTool } = require("./deleteDevice");
const { registerDeleteNetworkTool } = require("./deleteNetwork");
const { registerUpdateMachineTool } = require("./updateMachine");
const { registerUpdateDeviceTool } = require("./updateDevice");
const { registerUpdateNetworkTool } = require("./updateNetwork");
const { registerListSubnetsTool } = require("./listSubnets");
const { registerUploadImageTool } = require("./uploadImage");
const { registerUploadScriptTool } = require("./uploadScript");
const { registerDeployMachineWithProgressTool } = require("./deployMachineWithProgress");
const { registerCommissionMachineWithProgressTool } = require("./commissionMachineWithProgress");

/**
 * Register all MCP tools with the server
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
function registerTools(server, maasClient) {
  // Register all tools
  registerListMachinesTool(server, maasClient);
  registerDeployMachineTool(server, maasClient);
  registerTagManagementTools(server, maasClient);
  registerAllocateMachineTool(server, maasClient);
  registerCreateMachineTool(server, maasClient);
  registerCreateDeviceTool(server, maasClient);
  registerCreateNetworkTool(server, maasClient);
  registerDeleteMachineTool(server, maasClient);
  registerDeleteDeviceTool(server, maasClient);
  registerDeleteNetworkTool(server, maasClient);
  registerUpdateMachineTool(server, maasClient);
  registerUpdateDeviceTool(server, maasClient);
  registerUpdateNetworkTool(server, maasClient);
  registerListSubnetsTool(server, maasClient);
  registerUploadImageTool(server, maasClient);
  registerUploadScriptTool(server, maasClient);
  registerDeployMachineWithProgressTool(server, maasClient);
  registerCommissionMachineWithProgressTool(server, maasClient);
}

module.exports = { registerTools };