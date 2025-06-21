# Contributing to MAAS MCP Server

Thank you for considering contributing to the MAAS MCP Server project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate of others.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Any relevant logs or screenshots
- Your environment (OS, Go version, etc.)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear, descriptive title
- A detailed description of the proposed feature
- Any relevant examples or use cases
- If possible, an implementation approach

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run tests: `make test`
5. Run linters: `make lint`
6. Commit your changes with a descriptive message
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a pull request to the `main` branch

## Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/maas-mcp-server.git
   cd maas-mcp-server
   ```

2. Install development tools:
   ```
   make install-tools
   ```

3. Build the project:
   ```
   make build
   ```

4. Run tests:
   ```
   make test
   ```

### Updating MAAS Tools

The MAAS tools available through the MCP server are dynamically generated from the MAAS API documentation. If you need to update these tool definitions due to changes in the MAAS API or to improve the parsing/generation process, please refer to the detailed instructions in the [MAAS API Tool Generation documentation (`cmd/gen-tools/README.md`)](cmd/gen-tools/README.md).

## Coding Standards

### Go Code

- Follow the [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- Use `gofmt` to format your code
- Document all exported functions, types, and constants
- Write tests for new functionality
- Ensure your code passes `golangci-lint`

### TypeScript Code

- Follow the project's ESLint configuration
- Document all exported functions, classes, and interfaces
- Write tests for new functionality

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line

## Testing

- Write unit tests for all new functionality
- Ensure all tests pass before submitting a pull request
- Include integration tests for complex features

## Documentation

- Update the README.md with any necessary changes
- Document new features, tools, or resources
- Update the API documentation if applicable

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).