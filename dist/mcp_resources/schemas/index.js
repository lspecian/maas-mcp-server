"use strict";
/**
 * Re-exports all schema definitions from the mcp_resources/schemas directory.
 * This file provides a convenient way to import multiple schemas from a single location.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Export all URI patterns from a centralized location
__exportStar(require("./uriPatterns.ts"), exports);
// Export all schema definitions
__exportStar(require("./machineDetailsSchema.js"), exports);
__exportStar(require("./tagResourcesSchema.js"), exports);
__exportStar(require("./zoneResourceSchema.js"), exports);
__exportStar(require("./deviceResourceSchema.js"), exports);
__exportStar(require("./domainResourceSchema.js"), exports);
__exportStar(require("./subnetResourceSchema.js"), exports);
// Export collection query parameter schemas
__exportStar(require("./collectionQueryParams.js"), exports);
