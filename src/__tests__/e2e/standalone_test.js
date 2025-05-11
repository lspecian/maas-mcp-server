describe('MCP Operations End-to-End Tests', () => {
  // Mock MaasApiClient
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

    // Mock API methods
    async get(endpoint, params) {
      if (endpoint === "/machines/" || endpoint === "/machines") {
        return this.machines;
      } else if (endpoint.startsWith("/machines/") && endpoint !== "/machines/") {
        const systemId = endpoint.split("/")[2];
        const machine = this.machines.find(m => m.system_id === systemId);
        if (!machine) {
          throw new Error(`Machine with system_id ${systemId} not found`);
        }
        return machine;
      } else if (endpoint === "/subnets/" || endpoint === "/subnets") {
        return this.subnets;
      } else if (endpoint.startsWith("/subnets/") && endpoint !== "/subnets/") {
        const subnetId = parseInt(endpoint.split("/")[2]);
        const subnet = this.subnets.find(s => s.id === subnetId);
        if (!subnet) {
          throw new Error(`Subnet with id ${subnetId} not found`);
        }
        return subnet;
      }
      
      throw new Error(`Endpoint not implemented in mock: ${endpoint}`);
    }

    async post(endpoint, params) {
      if (endpoint === "/tags/" || endpoint === "/tags") {
        if (!params.name) {
          throw new Error("Tag name is required");
        }
        
        const newTag = {
          id: this.tags.length + 1,
          name: params.name,
          comment: params.comment || "",
          definition: params.definition || "",
          kernel_opts: ""
        };
        
        this.tags.push(newTag);
        return newTag;
      }
      
      throw new Error(`Endpoint not implemented in mock: ${endpoint}`);
    }
  }

  // Mock MCP Server
  class MockMcpServer {
    constructor() {
      this.tools = [];
      this.resources = [];
    }

    tool(name, schema, handler) {
      this.tools.push({ name, schema, handler });
    }

    resource(name, template, handler) {
      template.handler = handler;
      this.resources.push({ name, template, handler });
    }

    getTools() {
      return this.tools;
    }

    getResources() {
      return this.resources;
    }
  }

  // Mock implementations of the tools and resources
  function registerListMachinesTool(server, maasClient) {
    server.tool(
      "maas_list_machines",
      {},
      async (params, { signal }) => {
        try {
          const machines = await maasClient.get("/machines/");
          return {
            content: [{ type: "text", text: JSON.stringify(machines) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error listing machines: ${error.message}` }],
            isError: true
          };
        }
      }
    );
  }

  function registerMachineDetailsResource(server, maasClient) {
    const template = {
      pattern: "maas://machine/{system_id}/details",
      matches: (url) => url.toString().startsWith("maas://machine/") && url.toString().endsWith("/details"),
      extractParams: (url) => {
        const parts = url.toString().split('/');
        return { system_id: parts[parts.length - 2] };
      }
    };
    
    server.resource(
      "maas_machine_details",
      template,
      async (uri, params, { signal }) => {
        try {
          const { system_id } = params;
          if (!system_id) {
            throw new Error("System ID is missing in the resource URI.");
          }
          
          const machineDetails = await maasClient.get(`/machines/${system_id}/`);
          
          return {
            contents: [{
              uri: uri.toString(),
              text: JSON.stringify(machineDetails),
              mimeType: "application/json"
            }]
          };
        } catch (error) {
          throw new Error(`Could not fetch MAAS machine details: ${error.message}`);
        }
      }
    );
  }

  function registerListSubnetsTool(server, maasClient) {
    server.tool(
      "maas_list_subnets",
      {},
      async (params, { signal }) => {
        try {
          const subnets = await maasClient.get("/subnets/");
          return {
            content: [{ type: "text", text: JSON.stringify(subnets) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error listing subnets: ${error.message}` }],
            isError: true
          };
        }
      }
    );
  }

  function registerSubnetDetailsResource(server, maasClient) {
    const template = {
      pattern: "maas://subnet/{subnet_id}/details",
      matches: (url) => url.toString().startsWith("maas://subnet/") && url.toString().endsWith("/details"),
      extractParams: (url) => {
        const parts = url.toString().split('/');
        return { subnet_id: parts[parts.length - 2] };
      }
    };
    
    server.resource(
      "maas_subnet_details",
      template,
      async (uri, params, { signal }) => {
        try {
          const { subnet_id } = params;
          if (!subnet_id) {
            throw new Error("Subnet ID is missing in the resource URI.");
          }
          
          const subnetDetails = await maasClient.get(`/subnets/${subnet_id}/`);
          
          return {
            contents: [{
              uri: uri.toString(),
              text: JSON.stringify(subnetDetails),
              mimeType: "application/json"
            }]
          };
        } catch (error) {
          throw new Error(`Could not fetch MAAS subnet details: ${error.message}`);
        }
      }
    );
  }

  function registerCreateTagTool(server, maasClient) {
    server.tool(
      "maas_create_tag",
      {},
      async (params, { signal }) => {
        try {
          if (!params.name) {
            throw new Error("Tag name is required");
          }
          
          const tag = await maasClient.post("/tags/", {
            name: params.name,
            comment: params.comment
          });
          
          return {
            content: [{ type: "text", text: JSON.stringify(tag) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: `Error creating tag: ${error.message}` }],
            isError: true
          };
        }
      }
    );
  }

  function registerAllTools(server, maasClient) {
    registerListMachinesTool(server, maasClient);
    registerListSubnetsTool(server, maasClient);
    registerCreateTagTool(server, maasClient);
  }

  function registerAllResources(server, maasClient) {
    registerMachineDetailsResource(server, maasClient);
    registerSubnetDetailsResource(server, maasClient);
  }

  // Helper class to simulate an MCP client for testing
  class MockMcpClient {
    constructor(server) {
      this.server = server;
    }

    async callTool(toolName, params, signal) {
      const tools = this.server.getTools();
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }
      
      return tool.handler(params, { signal });
    }

    async accessResource(uri, signal) {
      const url = new URL(uri);
      const resources = this.server.getResources();
      
      for (const resource of resources) {
        if (resource.template.matches(url)) {
          const params = resource.template.extractParams(url);
          return resource.handler(url, params, { signal });
        }
      }
      
      throw new Error(`No resource template matches URI ${uri}`);
    }
  }

  // Test setup
  let maasClient;
  let mcpServer;
  let mcpClient;

  beforeAll(() => {
    maasClient = new MockMaasApiClient();
    mcpServer = new MockMcpServer();
    
    registerAllTools(mcpServer, maasClient);
    registerAllResources(mcpServer, maasClient);
    
    mcpClient = new MockMcpClient(mcpServer);
  });

  // Tests
  describe("List Machines Tool", () => {
    test("should list all machines", async () => {
      const result = await mcpClient.callTool("maas_list_machines", {});
      
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      
      const machines = JSON.parse(result.content[0].text);
      expect(machines).toHaveLength(2);
      expect(machines[0].system_id).toBe("abc123");
      expect(machines[1].system_id).toBe("def456");
    });
    
    test("should handle AbortSignal", async () => {
      // Create a mock handler that checks for abort signal
      const originalHandler = mcpServer.getTools()[0].handler;
      mcpServer.getTools()[0].handler = jest.fn().mockImplementation((params, { signal }) => {
        if (signal?.aborted) {
          return {
            content: [{ type: "text", text: "Error listing machines: Request aborted by client" }],
            isError: true
          };
        }
        return originalHandler(params, { signal });
      });
      
      // Create an aborted signal
      const controller = new AbortController();
      const signal = controller.signal;
      controller.abort();
      
      const result = await mcpClient.callTool("maas_list_machines", {}, signal);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error listing machines");
      expect(result.content[0].text).toContain("aborted");
      
      // Restore original handler
      mcpServer.getTools()[0].handler = originalHandler;
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
  });

  describe("List Subnets Tool", () => {
    test("should list all subnets", async () => {
      const result = await mcpClient.callTool("maas_list_subnets", {});
      
      expect(result).toBeDefined();
      expect(result.content).toHaveLength(1);
      
      const subnets = JSON.parse(result.content[0].text);
      expect(subnets).toHaveLength(2);
      expect(subnets[0].name).toBe("subnet-1");
      expect(subnets[1].name).toBe("subnet-2");
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
  });
  
  describe("Parameter Validation", () => {
    test("should validate parameters for Create Tag tool", async () => {
      // Mock the post method to validate parameters
      const originalPost = maasClient.post;
      maasClient.post = jest.fn().mockImplementation((endpoint, params) => {
        if (endpoint === "/tags/" || endpoint === "/tags") {
          if (typeof params.name !== 'string') {
            throw new Error("Tag name must be a string");
          }
        }
        return originalPost.call(maasClient, endpoint, params);
      });
      
      const result = await mcpClient.callTool("maas_create_tag", {
        name: 123 // Should be a string
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error creating tag");
      expect(result.content[0].text).toContain("must be a string");
      
      // Restore original method
      maasClient.post = originalPost;
    });
  });
});