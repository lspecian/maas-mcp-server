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

// Import after mocks
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { MaasApiError } = require("../../maas/MaasApiClient.ts");
const { registerAllTools } = require("../../mcp_tools/index.ts");
const { registerAllResources } = require("../../mcp_resources/index.ts");

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
   * Simulates a PUT request to the MAAS API
   */
  async put(endpoint, params, signal) {
    throw new MaasApiError("PUT method not implemented in mock", 501);
  }

  /**
   * Simulates a DELETE request to the MAAS API
   */
  async delete(endpoint, params, signal) {
    throw new MaasApiError("DELETE method not implemented in mock", 501);
  }

  /**
   * Simulates listing machines with optional filtering
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
      
      if (params.zone) {
        filteredMachines = filteredMachines.filter(m => 
          m.zone.name === params.zone);
      }
      
      if (params.pool) {
        filteredMachines = filteredMachines.filter(m => 
          m.pool.name === params.pool);
      }
      
      if (params.owner) {
        filteredMachines = filteredMachines.filter(m => 
          m.owner === params.owner);
      }
      
      if (params.architecture) {
        filteredMachines = filteredMachines.filter(m => 
          m.architecture === params.architecture);
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
   */
  _getMachine(systemId) {
    const machine = this.machines.find(m => m.system_id === systemId);
    
    if (!machine) {
      throw new MaasApiError(`Machine with system_id ${systemId} not found`, 404);
    }
    
    return machine;
  }

  /**
   * Simulates listing subnets with optional filtering
   */
  _listSubnets(params) {
    let filteredSubnets = [...this.subnets];
    
    // Apply filters if provided
    if (params) {
      if (params.cidr) {
        filteredSubnets = filteredSubnets.filter(s => 
          s.cidr === params.cidr);
      }
      
      if (params.name) {
        filteredSubnets = filteredSubnets.filter(s => 
          s.name.includes(params.name));
      }
      
      if (params.vlan) {
        filteredSubnets = filteredSubnets.filter(s => 
          s.vlan.name === params.vlan);
      }
    }
    
    return filteredSubnets;
  }

  /**
   * Simulates getting a specific subnet by id
   */
  _getSubnet(id) {
    const subnet = this.subnets.find(s => s.id === id);
    
    if (!subnet) {
      throw new MaasApiError(`Subnet with id ${id} not found`, 404);
    }
    
    return subnet;
  }

  /**
   * Simulates listing all tags
   */
  _listTags() {
    return [...this.tags];
  }

  /**
   * Simulates creating a new tag
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
  constructor(server) {
    this.server = server;
  }

  /**
   * Calls a tool on the MCP server
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

describe("MCP Operations End-to-End Tests", () => {
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

  describe("List Machines Tool", () => {
    test("should list all machines when no parameters are provided", async () => {
      const result = await mcpClient.callTool("maas_list_machines", {});
      
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(2);
      expect(machines[0].system_id).toBe("abc123");
      expect(machines[1].system_id).toBe("def456");
    });

    test("should filter machines by hostname", async () => {
      const result = await mcpClient.callTool("maas_list_machines", { hostname: "test-machine-1" });
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
      expect(machines[0].hostname).toBe("test-machine-1");
    });

    test("should filter machines by tag", async () => {
      const result = await mcpClient.callTool("maas_list_machines", { tag_names: ["tag1"] });
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
      expect(machines[0].tags).toContain("tag1");
    });

    test("should handle pagination parameters", async () => {
      const result = await mcpClient.callTool("maas_list_machines", { limit: 1 });
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(1);
    });

    test("should handle AbortSignal", async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Abort immediately
      controller.abort();
      
      const result = await mcpClient.callTool("maas_list_machines", {}, signal);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error listing machines");
    });
  });

  describe("Machine Details Resource", () => {
    test("should retrieve machine details by system_id", async () => {
      const result = await mcpClient.accessResource("maas://machine/abc123/details");
      
      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");
      
      const machine = JSON.parse(result.contents[0].text);
      expect(machine.system_id).toBe("abc123");
      expect(machine.hostname).toBe("test-machine-1");
    });

    test("should handle non-existent machine", async () => {
      await expect(mcpClient.accessResource("maas://machine/nonexistent/details"))
        .rejects.toThrow("Could not fetch MAAS machine details");
    });

    test("should handle AbortSignal", async () => {
      const controller = new AbortController();
      const signal = controller.signal;
      
      // Abort immediately
      controller.abort();
      
      await expect(mcpClient.accessResource("maas://machine/abc123/details", signal))
        .rejects.toThrow();
    });
  });

  describe("List Subnets Tool", () => {
    test("should list all subnets when no parameters are provided", async () => {
      const result = await mcpClient.callTool("maas_list_subnets", {});
      
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      
      const subnets = JSON.parse(result.content[0].text);
      expect(subnets).toHaveLength(2);
      expect(subnets[0].name).toBe("subnet-1");
      expect(subnets[1].name).toBe("subnet-2");
    });

    test("should filter subnets by name", async () => {
      const result = await mcpClient.callTool("maas_list_subnets", { name: "subnet-1" });
      
      const subnets = JSON.parse(result.content[0].text);
      expect(subnets).toHaveLength(1);
      expect(subnets[0].name).toBe("subnet-1");
    });

    test("should filter subnets by CIDR", async () => {
      const result = await mcpClient.callTool("maas_list_subnets", { cidr: "10.0.0.0/24" });
      
      const subnets = JSON.parse(result.content[0].text);
      expect(subnets).toHaveLength(1);
      expect(subnets[0].cidr).toBe("10.0.0.0/24");
    });

    test("should handle error conditions", async () => {
      // Mock an error by using an invalid endpoint
      jest.spyOn(mockMaasClient, 'get').mockImplementationOnce(() => {
        throw new MaasApiError("Test error", 500);
      });
      
      const result = await mcpClient.callTool("maas_list_subnets", {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error listing subnets");
    });
  });

  describe("Subnet Details Resource", () => {
    test("should retrieve subnet details by subnet_id", async () => {
      const result = await mcpClient.accessResource("maas://subnet/1/details");
      
      expect(result).toBeDefined();
      expect(result.contents).toHaveLength(1);
      
      const subnet = JSON.parse(result.contents[0].text);
      expect(subnet.id).toBe(1);
      expect(subnet.name).toBe("subnet-1");
    });

    test("should handle non-existent subnet", async () => {
      await expect(mcpClient.accessResource("maas://subnet/999/details"))
        .rejects.toThrow("Could not fetch MAAS subnet details");
    });
  });

  describe("Create Tag Tool", () => {
    test("should create a new tag", async () => {
      const result = await mcpClient.callTool("maas_create_tag", { 
        name: "new-tag", 
        comment: "Test tag created via MCP" 
      });
      
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      
      const tag = JSON.parse(result.content[0].text);
      expect(tag.name).toBe("new-tag");
      expect(tag.comment).toBe("Test tag created via MCP");
    });

    test("should handle validation errors", async () => {
      const result = await mcpClient.callTool("maas_create_tag", {});
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error creating tag");
    });

    test("should handle duplicate tag names", async () => {
      // First create a tag
      await mcpClient.callTool("maas_create_tag", { name: "unique-tag" });
      
      // Try to create it again
      const result = await mcpClient.callTool("maas_create_tag", { name: "unique-tag" });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error creating tag");
    });
  });

  describe("Parameter Validation", () => {
    test("should validate parameters for List Machines tool", async () => {
      // Test with invalid parameter type
      const result = await mcpClient.callTool("maas_list_machines", { 
        limit: "not-a-number" 
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error listing machines");
    });

    test("should validate parameters for Create Tag tool", async () => {
      // Test with invalid parameter type
      const result = await mcpClient.callTool("maas_create_tag", { 
        name: 123 // Should be a string
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error creating tag");
    });
  });
});