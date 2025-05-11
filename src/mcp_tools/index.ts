// src/mcp_tools/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import { registerListMachinesTool } from "./listMachines.js";
import { registerDeployMachineTool } from "./deployMachine.js";
import { registerTagManagementTools } from "./tagManagement.js";
import { registerAllocateMachineTool } from "./allocateMachine.js";
import { registerCreateMachineTool } from "./createMachine.js";
import { registerCreateDeviceTool } from "./createDevice.js";
import { registerCreateNetworkTool } from "./createNetwork.js";
import { registerUpdateMachineTool } from "./updateMachine.js";
import { registerUpdateDeviceTool } from "./updateDevice.js";
import { registerUpdateNetworkTool } from "./updateNetwork.js";
import { registerDeleteMachineTool } from "./deleteMachine.js";
import { registerDeleteDeviceTool } from "./deleteDevice.js";
import { registerDeleteNetworkTool } from "./deleteNetwork.js";
import { registerUploadScriptTool } from "./uploadScript.js";
import { registerUploadImageTool } from "./uploadImage.js";
import { registerDeployMachineWithProgressTool } from "./deployMachineWithProgress.js";
import { registerCommissionMachineWithProgressTool } from "./commissionMachineWithProgress.js";

export function registerTools(server: McpServer, maasClient: MaasApiClient) {
  // Register all tools
  registerListMachinesTool(server, maasClient);
  registerDeployMachineTool(server, maasClient);
  registerTagManagementTools(server, maasClient);
  registerAllocateMachineTool(server, maasClient);
  registerCreateMachineTool(server, maasClient);
  registerCreateDeviceTool(server, maasClient);
  registerCreateNetworkTool(server, maasClient);

  // Register new PUT operation tools
  registerUpdateMachineTool(server, maasClient);
  registerUpdateDeviceTool(server, maasClient);
  registerUpdateNetworkTool(server, maasClient);
  
  // Register DELETE operation tools
  registerDeleteMachineTool(server, maasClient);
  registerDeleteDeviceTool(server, maasClient);
  registerDeleteNetworkTool(server, maasClient);
  
  // Register file upload tools
  registerUploadScriptTool(server, maasClient);
  registerUploadImageTool(server, maasClient);
  
  // Register tools with progress notification support
  registerDeployMachineWithProgressTool(server, maasClient);
  registerCommissionMachineWithProgressTool(server, maasClient);
}