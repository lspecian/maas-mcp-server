"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * MCP Resources for MAAS API
 *
 * This module provides MCP resources for accessing MAAS API data.
 * It defines URI patterns, resource templates, and handlers for each resource type.
 */
/* eslint-disable */
// @ts-nocheck
const path = require('path');
const sdkPath = path.join(__dirname, '..', '..', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'cjs');
const { McpServer } = require(path.join(sdkPath, 'server', 'mcp.js'));
const { MaasApiClient } = require("../maas/MaasApiClient");
const logger = require("../utils/logger");
// Import resource handlers
const { registerTagsResource } = require('./tagsResource');
const { registerDomainResource } = require('./domainResource');
const { registerZoneResource } = require('./zoneResource');
const { registerDeviceResource } = require('./deviceResource');
const { registerMachineDetailsResource } = require('./machineDetails');
const { registerSubnetDetailsResource } = require('./subnetDetails');
/**
 * Register all MCP resources with the MCP server
 *
 * @param {McpServer} server - The MCP server instance
 * @param {MaasApiClient} maasClient - The MAAS API client instance
 */
function registerMcpResources(server, maasClient) {
    logger.info('Registering MCP resources');
    // Register all resources with try-catch blocks to handle already registered resources
    try {
        registerTagsResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering tags resource:', error.message);
    }
    try {
        registerDomainResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering domain resource:', error.message);
    }
    try {
        registerZoneResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering zone resource:', error.message);
    }
    try {
        registerDeviceResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering device resource:', error.message);
    }
    try {
        registerMachineDetailsResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering machine details resource:', error.message);
    }
    try {
        registerSubnetDetailsResource(server, maasClient);
    }
    catch (error) {
        logger.warn('Error registering subnet details resource:', error.message);
    }
    logger.info('MCP resources registered');
}
module.exports = { registerMcpResources };
