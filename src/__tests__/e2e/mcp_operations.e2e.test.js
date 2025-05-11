/**
 * End-to-End Tests for MCP Operations
 * 
 * These tests verify the complete flow of MCP operations from client to server,
 * including actual tool execution and resource access with mocked MAAS API responses.
 */

// 1. Imports
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { MaasApiError } = require("../../maas/MaasApiClient.js");
const { registerAllTools } = require("../../mcp_tools/index.js");
const { registerAllResources } = require("../../mcp_resources/index.js");

// 2. Mocks
// Mock the MCP Server
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: jest.fn().mockImplementation(() => {
      const tools = [];
      const resources = [];
      const resourceTemplates = [];
      
      return {
        tool: (name, schema, handler) => {
          tools.push({ name, schema, handler });
        },
        resource: (name, template, handler) => {
          template.handler = handler;
          template.matches = (url) => {
            // Simple pattern matching for testing
            const pattern = template.pattern.replace(/{([^}]+)}/g, '([^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(url.toString());
          };
          template.extractParams = (url) => {
            // Extract parameters from URL based on pattern
            const pattern = template.pattern;
            const paramNames = (pattern.match(/{([^}]+)}/g) || [])
              .map((p) => p.slice(1, -1));
            
            // For this mock, we'll just extract the system_id or subnet_id from the URL path
            const parts = url.toString().split('/');
            if (pattern.includes('{system_id}')) {
              return { system_id: parts[parts.length - 2] };
            } else if (pattern.includes('{subnet_id}')) {
              return { subnet_id: parts[parts.length - 2] };
            }
            
            return {};
          };
          resourceTemplates.push(template);
        },
        getTools: () => tools,
        getResourceTemplates: () => resourceTemplates
      };
    })
  };
});

// 3. Test fixtures and setup
/**
 * MockMaasApiClient class that simulates API responses for MAAS API endpoints
 */
class MockMaasApiClient {
  constructor() {
    // Mock data for machines
    this.machines = [
      {
        system_id: "abc123",
        hostname: "test-machine-1",
        domain: { id: 1, name: "maas" },
        architecture: "amd64/generic",
        status: 4,
        status_name: "Ready",
        owner: "admin",
        owner_data: { key: "value" },
        ip_addresses: ["192.168.1.100"],
        cpu_count: 4,
        memory: 8192,
        zone: { id: 1, name: "default" },
        pool: { id: 1, name: "default" },
        tags: ["tag1", "tag2"]
      },
      {
        system_id: "def456",
        hostname: "test-machine-2",
        domain: { id: 1, name: "maas" },
        architecture: "amd64/generic",
        status: 6,
        status_name: "Deployed",
        owner: "user1",
        owner_data: null,
        ip_addresses: ["192.168.1.101"],
        cpu_count: 8,
        memory: 16384,
        zone: { id: 1, name: "default" },
        pool: { id: 2, name: "production" },
        tags: ["tag3"]
      }
    ];

    // Mock data for subnets
    this.subnets = [
      {
        id: 1,
        name: "subnet-1",
        cidr: "192.168.1.0/24",
        vlan: { id: 1, name: "vlan-1", fabric: "fabric-1" },
        gateway_ip: "192.168.1.1",
        dns_servers: ["8.8.8.8", "8.8.4.4"],
        active_discovery: true,
        managed: true
      },
      {
        id: 2,
        name: "subnet-2",
        cidr: "10.0.0.0/24",
        vlan: { id: 2, name: "vlan-2", fabric: "fabric-1" },
        gateway_ip: "10.0.0.1",
        dns_servers: ["8.8.8.8"],
        active_discovery: false,
        managed: true
      }
    ];

    // Mock data for tags
    this.tags = [
      {
        id: 1,
        name: "tag1",
        comment: "Test tag 1",
        definition: "",
        kernel_opts: ""
      },
      {
        id: 2,
        name: "tag2",
        comment: "Test tag 2",
        definition: "",
        kernel_opts: ""
      },
      {
        id: 3,
        name: "tag3",
        comment: "Test tag 3",
        definition: "",
        kernel_opts: ""
      }
    ];
  }

  /**
   * Simulates a GET request to the MAAS API
   * @param {string} endpoint - The API endpoint
   * @param {Object} params - Query parameters
   * @param {AbortSignal} signal - AbortSignal for cancellation
   * @returns {Promise<Object>} The response data
   */
  async get(endpoint, params, signal) {
    // Check if the request was aborted
    if (signal?.aborted) {
      throw new MaasApiError("Request aborted by client", 0);
    }

    // Simulate network delay
    await this.delay(50);

    // Handle different endpoints
    if (endpoint === "/machines" || endpoint === "/machines/") {
      return this._listMachines(params);
    } else if (endpoint.startsWith("/machines/") && endpoint !== "/machines/") {
      const systemId = endpoint.split("/")[2];
      return this._getMachine(systemId);
    } else if (endpoint === "/subnets" || endpoint === "/subnets/") {
      return this._listSubnets(params);
    } else if (endpoint.startsWith("/subnets/") && endpoint !== "/subnets/") {
      const subnetId = parseInt(endpoint.split("/")[2]);
      return this._getSubnet(subnetId);
    } else if (endpoint === "/tags" || endpoint === "/tags/") {
      return this._listTags();
    } else {
      throw new MaasApiError(`Endpoint not implemented in mock: ${endpoint}`, 404);
    }
  }

  /**
   * Simulates a POST request to the MAAS API
   * @param {string} endpoint - The API endpoint
   * @param {Object} params - Request body parameters
   * @param {AbortSignal} signal - AbortSignal for cancellation
   * @returns {Promise<Object>} The response data
   */
  async post(endpoint, params, signal) {
    // Check if the request was aborted
    if (signal?.aborted) {
      throw new MaasApiError("Request aborted by client", 0);
    }

    // Simulate network delay
    await this.delay(50);

    // Handle different endpoints
    if (endpoint === "/tags/" || endpoint === "/tags") {
      return this._createTag(params);
    } else {
      throw new MaasApiError(`Endpoint not implemented in mock: ${endpoint}`, 404);
    }
  }

  /**
   * Simulates listing machines with optional filtering
   * @param {Object} params - Filter parameters
   * @returns {Array} Filtered machines
   * @private
   */
  _listMachines(params) {
    let filteredMachines = [...this.machines];

    // Apply filters if provided
    if (params) {
      if (params.hostname) {
        filteredMachines = filteredMachines.filter(m => 
          m.hostname.includes(params.hostname));
      }
      
      if (params.mac_addresses) {
        // In a real implementation, this would filter by MAC address
        // For the mock, we'll just return a subset
        filteredMachines = filteredMachines.slice(0, 1);
      }
      
      if (params.tag_names) {
        const tagNames = params.tag_names.split(',');
        filteredMachines = filteredMachines.filter(m => 
          tagNames.some(tag => m.tags.includes(tag)));
      }
      
      if (params.status) {
        // Convert status name to status code for comparison
        const statusMap = {
          'ready': 4,
          'deployed': 6
        };
        
        const statusCode = statusMap[params.status.toLowerCase()];
        if (statusCode) {
          filteredMachines = filteredMachines.filter(m => m.status === statusCode);
        }
      }
      
      // Handle pagination
      if (typeof params.limit === 'number' || typeof params.offset === 'number') {
        const offset = typeof params.offset === 'number' ? params.offset : 0;
        const limit = typeof params.limit === 'number' ? params.limit : filteredMachines.length;
        
        filteredMachines = filteredMachines.slice(offset, offset + limit);
      }
    }

    return filteredMachines;
  }

  /**
   * Simulates getting a specific machine by system_id
   * @param {string} systemId - The system ID
   * @returns {Object} The machine data
   * @private
   */
  _getMachine(systemId) {
    const machine = this.machines.find(m => m.system_id === systemId);
    
    if (!machine) {
      throw new MaasApiError(`Machine with system_id ${systemId} not found`, 404);
    }
    
    return machine;
  }

  /**
   * Simulates creating a new tag
   * @param {Object} params - Tag parameters
   * @returns {Object} The created tag
   * @private
   */
  _createTag(params) {
    // Validate required parameters
    if (!params.name) {
      throw new MaasApiError("Tag name is required", 400);
    }
    
    // Check if tag already exists
    if (this.tags.some(t => t.name === params.name)) {
      throw new MaasApiError(`Tag with name ${params.name} already exists`, 409);
    }
    
    // Create new tag
    const newTag = {
      id: this.tags.length + 1,
      name: params.name,
      comment: params.comment || "",
      definition: params.definition || "",
      kernel_opts: ""
    };
    
    // Add to tags collection
    this.tags.push(newTag);
    
    return newTag;
  }

  /**
   * Helper method to simulate network delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   * @private
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods to match the real MaasApiClient interface
   */
  async listMachines(params, signal) {
    return this.get('/machines/', params, signal);
  }

  async getMachine(systemId, signal) {
    return this.get(`/machines/${systemId}/`, undefined, signal);
  }

  async createTag(name, comment, definition, signal) {
    return this.post('/tags/', {
      name,
      ...(comment && { comment }),
      ...(definition && { definition })
    }, signal);
  }
}

/**
 * Helper class to simulate an MCP client for testing
 */
class MockMcpClient {
  /**
   * Creates a new MockMcpClient
   * @param {Object} server - The MCP server instance
   */
  constructor(server) {
    this.server = server;
  }

  /**
   * Calls a tool on the MCP server
   * @param {string} toolName - The name of the tool to call
   * @param {Object} params - The parameters to pass to the tool
   * @param {AbortSignal} signal - AbortSignal for cancellation
   * @returns {Promise<Object>} The tool response
   */
  async callTool(toolName, params, signal) {
    // Find the tool in the server
    const tools = this.server.getTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    // Call the tool's handler
    return tool.handler(params, { signal });
  }

  /**
   * Accesses a resource on the MCP server
   * @param {string} uri - The URI of the resource to access
   * @param {AbortSignal} signal - AbortSignal for cancellation
   * @returns {Promise<Object>} The resource data
   */
  async accessResource(uri, signal) {
    // Parse the URI to extract parameters
    const url = new URL(uri);
    const resourceTemplate = this.server.getResourceTemplates()
      .find(t => t.matches(url));
    
    if (!resourceTemplate) {
      throw new Error(`No resource template matches URI ${uri}`);
    }
    
    const params = resourceTemplate.extractParams(url);
    
    // Call the resource's handler
    return resourceTemplate.handler(url, params, { signal });
  }
}

// 4. Test suite
describe('MCP Operations E2E', () => {
  // 5. Setup and teardown
  let mockMaasClient;
  let mcpServer;
  let mcpClient;

  beforeAll(() => {
    // Create mock instances
    mockMaasClient = new MockMaasApiClient();
    mcpServer = new McpServer({
      name: "Test MCP Server",
      version: "1.0.0"
    });
    
    // Register all tools and resources
    registerAllTools(mcpServer, mockMaasClient);
    registerAllResources(mcpServer, mockMaasClient);
    
    // Create MCP client
    mcpClient = new MockMcpClient(mcpServer);
  });

  // 6. Test cases
  describe('List Machines Tool', () => {
    test('should list all machines when no parameters are provided', async () => {
      // Act
      const result = await mcpClient.callTool("maas_list_machines", {});
      
      // Assert
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(2);
      expect(machines[0].system_id).toBe("abc123");
      expect(machines[1].system_id).toBe("def456");
    });

    test('should filter machines by hostname when hostname parameter is provided', async () => {
      // Act
      const result = await mcpClient.callTool("maas_list_machines", { hostname: "test-machine-1" });
      
      // Assert
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
      expect(machines[0].hostname).toBe("test-machine-1");
    });

    test('should filter machines by tag when tag_names parameter is provided', async () => {
      // Act
      const result = await mcpClient.callTool("maas_list_machines", { tag_names: ["tag1"] });
      
      // Assert
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
      expect(machines[0].tags).toContain("tag1");
    });

    test('should handle pagination when limit parameter is provided', async () => {
      // Act
      const result = await mcpClient.callTool("maas_list_machines", { limit: 1 });
      
      // Assert
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
    });
  });

  describe('Create Tag Tool', () => {
    test('should create a new tag when valid parameters are provided', async () => {
      // Arrange
      const initialTagCount = mockMaasClient.tags.length;
      const newTagName = "new-test-tag";
      
      // Act
      const result = await mcpClient.callTool("maas_create_tag", { 
        name: newTagName,
        comment: "Test comment" 
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      
      const tag = JSON.parse(result.content[0].text);
      expect(tag.name).toBe(newTagName);
      expect(tag.comment).toBe("Test comment");
      
      // Verify the tag was added to the mock data
      expect(mockMaasClient.tags.length).toBe(initialTagCount + 1);
      expect(mockMaasClient.tags.find(t => t.name === newTagName)).toBeDefined();
    });

    test('should return error when creating a tag with a duplicate name', async () => {
      // Arrange
      const existingTagName = mockMaasClient.tags[0].name;
      
      // Act
      const result = await mcpClient.callTool("maas_create_tag", { 
        name: existingTagName 
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("already exists");
    });

    test('should return error when name parameter is missing', async () => {
      // Act
      const result = await mcpClient.callTool("maas_create_tag", {});
      
      // Assert
      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("required");
    });
  });

  describe('Resource Access', () => {
    test('should retrieve machine details when valid system_id is provided', async () => {
      // Act
      const result = await mcpClient.accessResource("maas://machines/abc123");
      
      // Assert
      expect(result).toBeDefined();
      expect(result.system_id).toBe("abc123");
      expect(result.hostname).toBe("test-machine-1");
    });

    test('should throw error when accessing non-existent machine', async () => {
      // Act & Assert
      await expect(mcpClient.accessResource("maas://machines/nonexistent"))
        .rejects.toThrow();
    });
  });

  describe('Request Cancellation', () => {
    test('should handle aborted requests gracefully', async () => {
      // Arrange
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Abort immediately
      controller.abort();
      
      // Act & Assert
      await expect(mcpClient.callTool("maas_list_machines", {}, signal))
        .rejects.toThrow();
    });
  });
});