import { z } from 'zod';

// JSON-RPC 2.0 Types
export type RequestId = string | number | null;

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id: RequestId;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: unknown;
  id: RequestId;
}

export interface JSONRPCError {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: RequestId;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse | JSONRPCError | JSONRPCNotification;

// Zod schemas for validation
export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
  id: z.union([z.string(), z.number(), z.null()]),
});

// Add schema for notifications (requests without an ID)
export const JSONRPCNotificationSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.unknown().optional(),
});

export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  result: z.unknown().optional(),
  id: z.union([z.string(), z.number(), z.null()]),
});

export const JSONRPCErrorSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
  id: z.union([z.string(), z.number(), z.null()]),
});

export const JSONRPCMessageSchema = z.union([
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema,
  JSONRPCNotificationSchema,
]);

// Helper functions
export function isJSONRPCRequest(message: unknown): message is JSONRPCRequest | JSONRPCNotification {
  return JSONRPCRequestSchema.safeParse(message).success || JSONRPCNotificationSchema.safeParse(message).success;
}

export function isJSONRPCResponse(message: unknown): message is JSONRPCResponse {
  return JSONRPCResponseSchema.safeParse(message).success;
}

export function isJSONRPCError(message: unknown): message is JSONRPCError {
  return JSONRPCErrorSchema.safeParse(message).success;
}

export function isInitializeRequest(message: unknown): boolean {
  if (!isJSONRPCRequest(message)) return false;
  return message.method === 'initialize';
}

// MAAS Configuration Types
export interface MaasConfig {
  apiUrl: string;
  apiKey: string;
}

// MAAS MCP Types
export interface MaasMachine {
  system_id: string;
  hostname: string;
  fqdn: string;
  status: string;
  zone: string;
  pool: string;
  tags: string[];
  power_state: string;
}

export interface MaasSubnet {
  id: number;
  name: string;
  cidr: string;
  vlan: number;
  space: string;
}

// MCP Tool Input Schemas
export const ListMachinesRequestSchema = z.object({
  filters: z.record(z.string()).optional(),
});

export const GetMachineDetailsRequestSchema = z.object({
  system_id: z.string(),
});

export const AllocateMachineRequestSchema = z.object({
  constraints: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const DeployMachineRequestSchema = z.object({
  system_id: z.string(),
  os_name: z.string().optional(),
  kernel: z.string().optional(),
});

export const ReleaseMachineRequestSchema = z.object({
  system_id: z.string(),
});

export const GetMachinePowerStateRequestSchema = z.object({
  system_id: z.string(),
});

export const ListSubnetsRequestSchema = z.object({
  fabric_id: z.number().optional(),
});

export const GetSubnetDetailsRequestSchema = z.object({
  subnet_id: z.number(),
});