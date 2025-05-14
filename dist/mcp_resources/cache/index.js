"use strict";
/**
 * Cache module for MCP resources
 * Exports all cache-related classes and interfaces
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
exports.CacheManager = exports.LRUCacheStrategy = exports.TimeBasedCacheStrategy = void 0;
// Export interfaces
__exportStar(require("./interfaces.js"), exports);
// Export cache strategies
var timeBasedCacheStrategy_js_1 = require("./timeBasedCacheStrategy.js");
Object.defineProperty(exports, "TimeBasedCacheStrategy", { enumerable: true, get: function () { return timeBasedCacheStrategy_js_1.TimeBasedCacheStrategy; } });
var lruCacheStrategy_js_1 = require("./lruCacheStrategy.js");
Object.defineProperty(exports, "LRUCacheStrategy", { enumerable: true, get: function () { return lruCacheStrategy_js_1.LRUCacheStrategy; } });
// Export cache manager
var cacheManager_js_1 = require("./cacheManager.js");
Object.defineProperty(exports, "CacheManager", { enumerable: true, get: function () { return cacheManager_js_1.CacheManager; } });
