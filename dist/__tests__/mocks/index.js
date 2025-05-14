"use strict";
/**
 * @file Unified Test Utilities API
 *
 * This file serves as a centralized entry point for all test utilities in the MAAS MCP Server project.
 * It exports all mock factories, utility functions, and predefined configurations from the various
 * test utility modules, making them easier to import and use in tests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.utils = exports.assertions = exports.setup = exports.configurations = exports.factories = exports.assertResourceAccessFailureLogged = exports.assertResourceAccessLogged = exports.assertCacheOperationLogged = exports.assertResourceRegistration = exports.createMockUrl = exports.createMockAbortSignal = exports.extractRegisteredCallback = exports.setupTestDependencies = exports.setupResourceUtilsMocks = exports.extractResourceUtilsCallback = exports.setupMockResourceUtils = exports.mockResourceUtilsConfigs = exports.createMockResourceUtils = exports.mockErrorResponse = exports.mockEmptyResult = exports.mockMachine = exports.mockMachines = exports.mockClientConfigs = exports.createMockMaasApiClient = exports.mockCacheEntry = exports.setupMockCacheManager = exports.mockCacheManagerConfigs = exports.createMockCacheManager = exports.getAuditLoggerCallCounts = exports.setupMockAuditLogger = exports.mockAuditLoggerConfigs = exports.createMockAuditLogger = void 0;
// Re-export from mockAuditLogger
var mockAuditLogger_js_1 = require("./mockAuditLogger.js");
Object.defineProperty(exports, "createMockAuditLogger", { enumerable: true, get: function () { return mockAuditLogger_js_1.createMockAuditLogger; } });
Object.defineProperty(exports, "mockAuditLoggerConfigs", { enumerable: true, get: function () { return mockAuditLogger_js_1.mockAuditLoggerConfigs; } });
Object.defineProperty(exports, "setupMockAuditLogger", { enumerable: true, get: function () { return mockAuditLogger_js_1.setupMockAuditLogger; } });
Object.defineProperty(exports, "getAuditLoggerCallCounts", { enumerable: true, get: function () { return mockAuditLogger_js_1.getAuditLoggerCallCounts; } });
// Re-export from mockCacheManager
var mockCacheManager_js_1 = require("./mockCacheManager.js");
Object.defineProperty(exports, "createMockCacheManager", { enumerable: true, get: function () { return mockCacheManager_js_1.createMockCacheManager; } });
Object.defineProperty(exports, "mockCacheManagerConfigs", { enumerable: true, get: function () { return mockCacheManager_js_1.mockCacheManagerConfigs; } });
Object.defineProperty(exports, "setupMockCacheManager", { enumerable: true, get: function () { return mockCacheManager_js_1.setupMockCacheManager; } });
Object.defineProperty(exports, "mockCacheEntry", { enumerable: true, get: function () { return mockCacheManager_js_1.mockCacheEntry; } });
// Re-export from mockMaasApiClient
var mockMaasApiClient_js_1 = require("./mockMaasApiClient.js");
Object.defineProperty(exports, "createMockMaasApiClient", { enumerable: true, get: function () { return mockMaasApiClient_js_1.createMockMaasApiClient; } });
Object.defineProperty(exports, "mockClientConfigs", { enumerable: true, get: function () { return mockMaasApiClient_js_1.mockClientConfigs; } });
Object.defineProperty(exports, "mockMachines", { enumerable: true, get: function () { return mockMaasApiClient_js_1.mockMachines; } });
Object.defineProperty(exports, "mockMachine", { enumerable: true, get: function () { return mockMaasApiClient_js_1.mockMachine; } });
Object.defineProperty(exports, "mockEmptyResult", { enumerable: true, get: function () { return mockMaasApiClient_js_1.mockEmptyResult; } });
Object.defineProperty(exports, "mockErrorResponse", { enumerable: true, get: function () { return mockMaasApiClient_js_1.mockErrorResponse; } });
// Re-export from mockResourceUtils
var mockResourceUtils_js_1 = require("./mockResourceUtils.js");
Object.defineProperty(exports, "createMockResourceUtils", { enumerable: true, get: function () { return mockResourceUtils_js_1.createMockResourceUtils; } });
Object.defineProperty(exports, "mockResourceUtilsConfigs", { enumerable: true, get: function () { return mockResourceUtils_js_1.mockResourceUtilsConfigs; } });
Object.defineProperty(exports, "setupMockResourceUtils", { enumerable: true, get: function () { return mockResourceUtils_js_1.setupMockResourceUtils; } });
// Rename extractRegisteredCallback to avoid conflict with testUtils
Object.defineProperty(exports, "extractResourceUtilsCallback", { enumerable: true, get: function () { return mockResourceUtils_js_1.extractRegisteredCallback; } });
// Re-export from testUtils
var testUtils_js_1 = require("./testUtils.js");
Object.defineProperty(exports, "setupResourceUtilsMocks", { enumerable: true, get: function () { return testUtils_js_1.setupResourceUtilsMocks; } });
Object.defineProperty(exports, "setupTestDependencies", { enumerable: true, get: function () { return testUtils_js_1.setupTestDependencies; } });
Object.defineProperty(exports, "extractRegisteredCallback", { enumerable: true, get: function () { return testUtils_js_1.extractRegisteredCallback; } });
Object.defineProperty(exports, "createMockAbortSignal", { enumerable: true, get: function () { return testUtils_js_1.createMockAbortSignal; } });
Object.defineProperty(exports, "createMockUrl", { enumerable: true, get: function () { return testUtils_js_1.createMockUrl; } });
Object.defineProperty(exports, "assertResourceRegistration", { enumerable: true, get: function () { return testUtils_js_1.assertResourceRegistration; } });
Object.defineProperty(exports, "assertCacheOperationLogged", { enumerable: true, get: function () { return testUtils_js_1.assertCacheOperationLogged; } });
Object.defineProperty(exports, "assertResourceAccessLogged", { enumerable: true, get: function () { return testUtils_js_1.assertResourceAccessLogged; } });
Object.defineProperty(exports, "assertResourceAccessFailureLogged", { enumerable: true, get: function () { return testUtils_js_1.assertResourceAccessFailureLogged; } });
/**
 * Categorized exports for documentation purposes.
 * These objects provide a structured view of the available utilities
 * but are not intended to be used directly in code.
 */
// Mock factory functions
exports.factories = {
    createMockAuditLogger,
    createMockCacheManager,
    createMockMaasApiClient,
    createMockResourceUtils,
    createMockAbortSignal,
    createMockUrl
};
// Predefined configurations
exports.configurations = {
    mockAuditLoggerConfigs,
    mockCacheManagerConfigs,
    mockClientConfigs,
    mockResourceUtilsConfigs
};
// Setup utilities
exports.setup = {
    setupMockAuditLogger,
    setupMockCacheManager,
    setupMockResourceUtils,
    setupResourceUtilsMocks,
    setupTestDependencies
};
// Assertion utilities
exports.assertions = {
    assertResourceRegistration,
    assertCacheOperationLogged,
    assertResourceAccessLogged,
    assertResourceAccessFailureLogged
};
// Utility functions
exports.utils = {
    extractRegisteredCallback,
    extractResourceUtilsCallback,
    getAuditLoggerCallCounts
};
