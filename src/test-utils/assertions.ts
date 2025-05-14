/**
 * Custom assertion helpers for TypeScript tests
 */

import { expect } from 'vitest';

/**
 * Check if an object has all required properties
 * @param obj - Object to check
 * @param properties - Array of property names that should exist
 */
export function expectToHaveProperties(obj: any, properties: string[]): void {
  for (const prop of properties) {
    expect(obj).toHaveProperty(prop);
  }
}

/**
 * Check if a machine has the expected structure
 * @param machine - Machine object to validate
 */
export function expectValidMachine(machine: any): void {
  expect(machine).toBeDefined();
  expectToHaveProperties(machine, [
    'id', 
    'hostname', 
    'status', 
    'power_state'
  ]);
}

/**
 * Check if a machine has the expected detailed structure
 * @param machine - Machine object to validate
 */
export function expectValidMachineDetails(machine: any): void {
  expectValidMachine(machine);
  expectToHaveProperties(machine, [
    'architecture',
    'cpu_count',
    'memory',
    'tags',
    'interfaces',
    'storage'
  ]);
  
  // Validate interfaces if present
  if (machine.interfaces && machine.interfaces.length > 0) {
    for (const iface of machine.interfaces) {
      expectValidNetworkInterface(iface);
    }
  }
  
  // Validate storage if present
  if (machine.storage && machine.storage.length > 0) {
    for (const device of machine.storage) {
      expectValidBlockDevice(device);
    }
  }
}

/**
 * Check if a subnet has the expected structure
 * @param subnet - Subnet object to validate
 */
export function expectValidSubnet(subnet: any): void {
  expect(subnet).toBeDefined();
  expectToHaveProperties(subnet, [
    'id',
    'name',
    'cidr',
    'gateway_ip'
  ]);
}

/**
 * Check if a VLAN has the expected structure
 * @param vlan - VLAN object to validate
 */
export function expectValidVLAN(vlan: any): void {
  expect(vlan).toBeDefined();
  expectToHaveProperties(vlan, [
    'id',
    'name',
    'vid',
    'fabric'
  ]);
}

/**
 * Check if a tag has the expected structure
 * @param tag - Tag object to validate
 */
export function expectValidTag(tag: any): void {
  expect(tag).toBeDefined();
  expectToHaveProperties(tag, [
    'name',
    'description'
  ]);
}

/**
 * Check if a network interface has the expected structure
 * @param iface - Network interface object to validate
 */
export function expectValidNetworkInterface(iface: any): void {
  expect(iface).toBeDefined();
  expectToHaveProperties(iface, [
    'id',
    'name',
    'mac_address'
  ]);
}

/**
 * Check if a block device has the expected structure
 * @param device - Block device object to validate
 */
export function expectValidBlockDevice(device: any): void {
  expect(device).toBeDefined();
  expectToHaveProperties(device, [
    'id',
    'name',
    'path',
    'size'
  ]);
}

/**
 * Check if an error has the expected structure
 * @param error - Error object to validate
 */
export function expectValidError(error: any): void {
  expect(error).toBeDefined();
  expectToHaveProperties(error, [
    'code',
    'message'
  ]);
}

/**
 * Check if a response has the expected pagination structure
 * @param response - Response object to validate
 */
export function expectValidPagination(response: any): void {
  expect(response).toBeDefined();
  expectToHaveProperties(response, [
    'items',
    'total',
    'page',
    'per_page'
  ]);
  
  expect(Array.isArray(response.items)).toBe(true);
  expect(typeof response.total).toBe('number');
  expect(typeof response.page).toBe('number');
  expect(typeof response.per_page).toBe('number');
}

/**
 * Check if a response contains the expected error
 * @param response - Response object to validate
 * @param expectedCode - Expected error code
 * @param expectedMessage - Expected error message (or part of it)
 */
export function expectError(response: any, expectedCode: string, expectedMessage?: string): void {
  expect(response).toBeDefined();
  expectToHaveProperties(response, ['error']);
  expectValidError(response.error);
  
  expect(response.error.code).toBe(expectedCode);
  
  if (expectedMessage) {
    expect(response.error.message).toContain(expectedMessage);
  }
}

/**
 * Check if a response contains the expected success result
 * @param response - Response object to validate
 */
export function expectSuccess(response: any): void {
  expect(response).toBeDefined();
  expect(response.error).toBeUndefined();
}

/**
 * Check if an array contains objects with a specific property value
 * @param array - Array to check
 * @param property - Property name to check
 * @param value - Expected value
 */
export function expectArrayToContainObjectWithProperty(array: any[], property: string, value: any): void {
  expect(Array.isArray(array)).toBe(true);
  const found = array.some(item => item[property] === value);
  expect(found).toBe(true, `Expected array to contain an object with ${property}=${value}`);
}

/**
 * Check if an array does not contain objects with a specific property value
 * @param array - Array to check
 * @param property - Property name to check
 * @param value - Value that should not be present
 */
export function expectArrayNotToContainObjectWithProperty(array: any[], property: string, value: any): void {
  expect(Array.isArray(array)).toBe(true);
  const found = array.some(item => item[property] === value);
  expect(found).toBe(false, `Expected array not to contain an object with ${property}=${value}`);
}

/**
 * Check if a function throws an error with a specific message
 * @param fn - Function to execute
 * @param expectedMessage - Expected error message (or part of it)
 */
export function expectToThrowWithMessage(fn: Function, expectedMessage: string): void {
  expect(fn).toThrow();
  try {
    fn();
  } catch (error: any) {
    expect(error.message).toContain(expectedMessage);
  }
}