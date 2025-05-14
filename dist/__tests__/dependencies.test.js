"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');
describe('Dependencies', () => {
    test('All required dependencies should be installed', () => {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');
        // Check core dependencies
        expect(fs.existsSync(path.join(nodeModulesPath, 'zod'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, '@modelcontextprotocol', 'sdk'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, 'dotenv'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, 'oauth'))).toBe(true);
        // Check dev dependencies
        expect(fs.existsSync(path.join(nodeModulesPath, 'typescript'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, 'jest'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, 'ts-jest'))).toBe(true);
        expect(fs.existsSync(path.join(nodeModulesPath, 'nodemon'))).toBe(true);
    });
});
