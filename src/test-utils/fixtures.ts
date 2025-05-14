/**
 * Test fixtures for TypeScript tests
 */

/**
 * Create a machine fixture with the given parameters
 * @param id - Machine ID
 * @param hostname - Machine hostname
 * @param status - Machine status (default: 'Ready')
 * @returns Machine object
 */
export function createMachineFixture(id: string, hostname: string, status: string = 'Ready'): any {
  return {
    id,
    hostname,
    status,
    power_state: 'off',
    tags: ['test'],
    interfaces: [
      { 
        id: 'eth0', 
        name: 'eth0', 
        mac_address: '00:11:22:33:44:55', 
        ip_address: '192.168.1.100' 
      },
    ],
    storage: [
      { 
        id: 'sda', 
        name: 'sda', 
        size: 1000000000, 
        type: 'ssd' 
      },
    ],
  };
}

/**
 * Create a machine details fixture with the given parameters
 * @param id - Machine ID
 * @param hostname - Machine hostname
 * @param status - Machine status (default: 'Ready')
 * @returns Machine details object
 */
export function createMachineDetailsFixture(id: string, hostname: string, status: string = 'Ready'): any {
  return {
    id,
    hostname,
    fqdn: `${hostname}.example.com`,
    status,
    architecture: 'amd64/generic',
    power_state: 'off',
    power_type: 'ipmi',
    zone: 'default',
    pool: 'default',
    tags: ['test'],
    ip_addresses: ['192.168.1.100'],
    cpu_count: 4,
    memory: 8192,
    os_system: 'ubuntu',
    distro_series: 'focal',
    interfaces: [
      { 
        id: 'eth0', 
        name: 'eth0', 
        type: 'physical',
        enabled: true,
        mac_address: '00:11:22:33:44:55', 
        ip_address: '192.168.1.100',
        vlan_id: 1,
        links: [
          {
            mode: 'static',
            subnet_id: 1,
            ip_address: '192.168.1.100'
          }
        ]
      },
    ],
    storage: [
      { 
        id: 'sda', 
        name: 'sda', 
        type: 'physical',
        path: '/dev/sda',
        size: 107374182400, // 100 GB
        used_size: 107374182400,
        available_size: 0,
        model: 'Test Disk',
        serial: 'TEST123'
      },
    ],
    owner: '',
    description: 'Test machine'
  };
}

/**
 * Create a subnet fixture with the given parameters
 * @param id - Subnet ID
 * @param name - Subnet name
 * @param cidr - Subnet CIDR
 * @returns Subnet object
 */
export function createSubnetFixture(id: string, name: string, cidr: string): any {
  return {
    id,
    name,
    cidr,
    fabric: 'fabric-1',
    vlan: 'vlan-1',
    vlan_tag: 1,
    space: 'default',
    gateway_ip: '192.168.1.1',
    dns_servers: ['8.8.8.8', '8.8.4.4'],
    managed: true,
    active: true,
    ip_ranges: [
      {
        type: 'dynamic',
        start_ip: '192.168.1.100',
        end_ip: '192.168.1.200'
      }
    ]
  };
}

/**
 * Create a VLAN fixture with the given parameters
 * @param id - VLAN ID
 * @param name - VLAN name
 * @param vid - VLAN VID
 * @returns VLAN object
 */
export function createVLANFixture(id: string, name: string, vid: number): any {
  return {
    id,
    name,
    vid,
    mtu: 1500,
    fabric: 'fabric-1',
    fabric_id: '1',
    dhcp_enabled: true,
    primary: false
  };
}

/**
 * Create a tag fixture with the given parameters
 * @param name - Tag name
 * @param description - Tag description
 * @returns Tag object
 */
export function createTagFixture(name: string, description: string): any {
  return {
    name,
    description,
    definition: '',
    comment: description
  };
}

/**
 * Create a block device fixture with the given parameters
 * @param id - Block device ID
 * @param name - Block device name
 * @param path - Block device path
 * @param size - Block device size in bytes
 * @returns Block device object
 */
export function createBlockDeviceFixture(id: string, name: string, path: string, size: number): any {
  return {
    id,
    name,
    type: 'physical',
    path,
    size,
    used_size: 0,
    available_size: size,
    model: 'Test Disk',
    serial: `TEST${id}`,
    tags: ['test-disk']
  };
}

/**
 * Create a network interface fixture with the given parameters
 * @param id - Network interface ID
 * @param name - Network interface name
 * @param macAddress - Network interface MAC address
 * @returns Network interface object
 */
export function createNetworkInterfaceFixture(id: string, name: string, macAddress: string): any {
  return {
    id,
    name,
    type: 'physical',
    enabled: true,
    mac_address: macAddress,
    vlan_id: 1,
    tags: ['test-interface'],
    links: [
      {
        mode: 'static',
        subnet_id: 1,
        ip_address: '192.168.1.100'
      }
    ]
  };
}

/**
 * Create a pagination fixture with the given parameters
 * @param items - Array of items
 * @param total - Total number of items
 * @param page - Current page number
 * @param perPage - Number of items per page
 * @returns Pagination object
 */
export function createPaginationFixture(items: any[], total: number, page: number, perPage: number): any {
  return {
    items,
    total,
    page,
    per_page: perPage
  };
}

/**
 * Create an error fixture with the given parameters
 * @param code - Error code
 * @param message - Error message
 * @returns Error object
 */
export function createErrorFixture(code: string, message: string): any {
  return {
    error: {
      code,
      message
    }
  };
}

/**
 * Create a success response fixture with the given data
 * @param data - Response data
 * @returns Success response object
 */
export function createSuccessFixture(data: any): any {
  return {
    success: true,
    data
  };
}

/**
 * Create a mock MCP tool response
 * @param toolName - Name of the tool
 * @param result - Tool result
 * @returns MCP tool response object
 */
export function createMCPToolResponseFixture(toolName: string, result: any): any {
  return {
    tool: toolName,
    result
  };
}

/**
 * Create a mock MCP resource response
 * @param uri - Resource URI
 * @param data - Resource data
 * @returns MCP resource response object
 */
export function createMCPResourceResponseFixture(uri: string, data: any): any {
  return {
    uri,
    data
  };
}