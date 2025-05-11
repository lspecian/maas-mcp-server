# Test Matrix: Requirements to Test Cases

This document maps the requirements from the PRDs to the test cases that verify them.

## Core Requirements

| Requirement | Test Cases | Status |
|-------------|------------|--------|
| Structured logging | `src/__tests__/logger.test.ts` | ✅ Passing |
| Error handling | `src/__tests__/errorHandler.test.ts` | ✅ Fixed |
| Secure configuration | `src/__tests__/config.test.ts` | ✅ Passing |
| MCP Tool registration | Various tool test files | ✅ Passing |
| MCP Resource handling | Resource handler test files | ✅ Passing |
| Progress notifications | `src/__tests__/utils/progressNotification.test.ts` | ✅ Passing |
| Abort signal handling | `src/__tests__/utils/abortSignalUtils.test.ts` | ✅ Passing |
| Operations registry | `src/__tests__/utils/operationsRegistry.test.ts` | ✅ Passing |
| Operation handler utils | `src/__tests__/utils/operationHandlerUtils.test.ts` | ✅ Fixed |

## MCP Tools

| Tool | Test Cases | Status |
|------|------------|--------|
| List Machines | `src/__tests__/mcp_tools/listMachines.test.ts` | ✅ Passing |
| List Subnets | `src/__tests__/mcp_tools/listSubnets.test.ts` | ✅ Passing |
| Create Tag | `src/__tests__/mcp_tools/createTag.test.ts` | ✅ Passing |
| Allocate Machine | `src/__tests__/mcp_tools/allocateMachine.test.ts` | ✅ Fixed |
| Deploy Machine | `src/__tests__/mcp_tools/deployMachine.test.ts` | ✅ Passing |
| Deploy Machine With Progress | `src/__tests__/mcp_tools/deployMachineWithProgress.test.ts` | ⚠️ Needs Fix |
| Commission Machine With Progress | `src/__tests__/mcp_tools/commissionMachineWithProgress.test.ts` | ⚠️ Needs Fix |
| Upload Script | `src/__tests__/mcp_tools/uploadScript.test.ts` | ✅ Passing |
| Upload Image | `src/__tests__/mcp_tools/uploadImage.test.ts` | ✅ Passing |
| Tag Management | `src/__tests__/mcp_tools/tagManagement.test.ts` | ✅ Passing |

## MCP Resources

| Resource | Test Cases | Status |
|----------|------------|--------|
| Machine Details | `src/__tests__/resources/MachineResourceHandler.test.ts` | ✅ Passing |
| Subnet Details | `src/__tests__/resources/SubnetResourceHandler.test.ts` | ✅ Passing |
| Tag Resources | `src/__tests__/resources/TagResourceHandler.test.ts` | ✅ Passing |
| Zone Resources | `src/__tests__/resources/ZoneResourceHandler.test.ts` | ✅ Passing |
| Domain Resources | `src/__tests__/resources/DomainResourceHandler.test.ts` | ✅ Passing |
| Device Resources | `src/__tests__/resources/DeviceResourceHandler.test.ts` | ✅ Passing |

## Key Use Cases

| Use Case | Test Cases | Status |
|----------|------------|--------|
| Machine listing and filtering | `src/__tests__/mcp_tools/listMachines.test.ts` | ✅ Passing |
| Machine deployment | `src/__tests__/mcp_tools/deployMachine.test.ts`, `src/__tests__/mcp_tools/deployMachineWithProgress.test.ts` | ⚠️ Partially Passing |
| Machine power operations | Not directly tested | ⚠️ Missing Tests |
| Network configuration | `src/__tests__/mcp_tools/listSubnets.test.ts` | ✅ Passing |
| Tag management | `src/__tests__/mcp_tools/createTag.test.ts`, `src/__tests__/mcp_tools/tagManagement.test.ts` | ✅ Passing |

## Integration Tests

| Test | Status |
|------|--------|
| `src/__tests__/integration.test.js` | ⚠️ Needs Review |
| `src/__tests__/integration/progress_notification.integration.test.ts` | ⚠️ Needs Review |

## Test Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| Utils | High | ✅ Good |
| MCP Tools | Medium-High | ⚠️ Some tests failing |
| MCP Resources | High | ✅ Good |
| Integration | Low | ⚠️ Needs Improvement |

## Remaining Issues

1. Fix the `deployMachineWithProgress.test.ts` and `commissionMachineWithProgress.test.ts` tests
2. Add more tests for machine power operations
3. Improve integration test coverage
4. Fix TypeScript errors in the cache manager tests