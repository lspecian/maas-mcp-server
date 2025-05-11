/**
 * MCP Resources for MAAS API
 *
 * This module provides MCP resources for accessing MAAS API data.
 * It defines URI patterns, resource templates, and handlers for each resource type.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MaasApiClient } from "../maas/MaasApiClient.js";
import logger from "../utils/logger.js";

// Import resource handlers
import {
  registerMachineResources,
  registerSubnetResources,
  registerZoneResources,
  registerDeviceResources,
  registerDomainResources,
  registerTagResources
} from "./handlers/index.js";

// Re-export schemas and URI patterns
export * from "./schemas/index.js";

// Re-export base resource handlers
export * from "./BaseResourceHandler.js";

// Re-export resource handlers
export * from "./handlers/index.js";

/**
 * Registers all MAAS resources with the MCP server
 *
 * @param server The MCP server instance
 * @param maasClient The MAAS API client instance
 */
export function registerResources(server: McpServer, maasClient: MaasApiClient) {
  try {
    logger.info("Registering MAAS MCP resources...");
    
    // Register core infrastructure resources
    logger.info("Registering core infrastructure resources...");
    
    // Machine resources - primary compute resources
    registerMachineResources(server, maasClient);
    
    // Subnet resources - networking resources
    registerSubnetResources(server, maasClient);
    
    // Zone resources - physical/logical grouping resources
    registerZoneResources(server, maasClient);
    
    // Register secondary resources
    logger.info("Registering secondary resources...");
    
    // Device resources - non-deployable network devices
    registerDeviceResources(server, maasClient);
    
    // Domain resources - DNS domains
    registerDomainResources(server, maasClient);
    
    // Register metadata resources
    logger.info("Registering metadata resources...");
    
    // Tag resources - metadata and grouping
    registerTagResources(server, maasClient);
    
    logger.info("All MAAS MCP resources registered successfully");
  } catch (error) {
    logger.error("Failed to register MAAS MCP resources", { error });
    throw new Error(`Failed to register MAAS MCP resources: ${error instanceof Error ? error.message : String(error)}`);
  }
}