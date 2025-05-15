# MAAS MCP Server Docker Image

This repository contains a Docker image for the MAAS MCP Server, which provides a Model Context Protocol (MCP) interface to MAAS (Metal as a Service).

## Building the Docker Image

You can build the Docker image using the provided script:

```bash
./build-docker.sh [registry/username]
```

If you don't specify a registry/username, it will default to `ghcr.io/lspecian`.

### Pushing to GitHub Container Registry

To push the image to GitHub Container Registry (ghcr.io), you need to authenticate with a GitHub token that has the appropriate permissions:

1. Create a GitHub Personal Access Token with the `write:packages` scope
2. Set the token as an environment variable:

```bash
export GITHUB_TOKEN=your_github_token
```

3. Run the build script and choose to push the image when prompted:

```bash
./build-docker.sh
# Answer 'y' when asked if you want to push the image
```

Alternatively, you can enter your token when prompted by the script.

## Running with Docker Compose

You can run the MCP server using Docker Compose:

1. Create a `.env` file with your MAAS API URL and key:

```
MAAS_API_URL=http://your-maas-server:5240/MAAS
MAAS_API_KEY=your-maas-api-key
```

2. Run the server:

```bash
docker-compose up -d
```

## Using with Roo

To use the MCP server with Roo, update your `.roo/mcp.json` file with the following configuration:

```json
{
  "mcpServers": {
    "maas-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "MAAS_API_URL",
        "-e",
        "MAAS_API_KEY",
        "ghcr.io/lspecian/maas-mcp-server:latest"
      ],
      "protocol": "stdio",
      "jsonrpc": "2.0",
      "readyMessage": "MCP server ready",
      "alwaysAllow": [
        "maas_list_machines",
        "maas_get_machine_details",
        "maas_allocate_machine",
        "maas_deploy_machine",
        "maas_release_machine",
        "maas_get_machine_power_state",
        "maas_power_on_machine",
        "maas_power_off_machine",
        "maas_list_subnets",
        "maas_get_subnet_details",
        "set_machine_storage_constraints",
        "get_machine_storage_constraints",
        "validate_machine_storage_constraints",
        "apply_machine_storage_constraints",
        "delete_machine_storage_constraints",
        "list_machines"
      ],
      "env": {
        "MAAS_API_URL": "http://your-maas-server:5240/MAAS",
        "MAAS_API_KEY": "your-maas-api-key"
      }
    }
  }
}
```

Replace `http://your-maas-server:5240/MAAS` and `your-maas-api-key` with your actual MAAS API URL and key.

## Available MCP Tools

The MAAS MCP Server provides the following tools:

- `maas_list_machines`: List machines with optional filtering
- `list_machines`: Alias for maas_list_machines
- `maas_get_machine_details`: Get details for a specific machine
- `maas_allocate_machine`: Allocate a machine based on constraints
- `maas_deploy_machine`: Deploy an allocated machine
- `maas_release_machine`: Release a machine back to the pool
- `maas_get_machine_power_state`: Get the power state of a machine
- `maas_power_on_machine`: Power on a machine
- `maas_power_off_machine`: Power off a machine
- `maas_list_subnets`: List subnets
- `maas_get_subnet_details`: Get details for a specific subnet
- `set_machine_storage_constraints`: Set storage constraints for a machine
- `get_machine_storage_constraints`: Get storage constraints for a machine
- `validate_machine_storage_constraints`: Validate storage constraints for a machine
- `apply_machine_storage_constraints`: Apply storage constraints to a machine
- `delete_machine_storage_constraints`: Delete storage constraints for a machine

## Environment Variables

The Docker image supports the following environment variables:

- `SERVER_HOST`: The host to bind the server to (default: 0.0.0.0)
- `SERVER_PORT`: The port to bind the server to (default: 8082)
- `LOG_LEVEL`: The log level (default: info)
- `AUTH_ENABLED`: Whether authentication is enabled (default: false)
- `MAAS_API_URL`: The URL of the MAAS API
- `MAAS_API_KEY`: The API key for the MAAS API