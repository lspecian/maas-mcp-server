# Contributing to MAAS MCP Server

Thank you for your interest in contributing to the MAAS MCP Server! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Set up the development environment as described in the README.md
4. Create a new branch for your feature or bug fix
5. Make your changes
6. Run tests to ensure your changes don't break existing functionality
7. Commit your changes
8. Push to your fork
9. Submit a pull request

## Development Environment

Make sure you have:
- Node.js 18 or later
- npm or yarn
- A MAAS instance for testing (or you can use mock data for development)

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style and formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Update documentation when adding or changing features

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting a pull request
- Run tests with `npm test`

## Pull Request Process

1. Update the README.md and other documentation with details of changes if applicable
2. Update the CHANGELOG.md with details of changes
3. The version number will be updated by the maintainers according to [Semantic Versioning](https://semver.org/)
4. Your pull request will be merged once it has been reviewed and approved by a maintainer

## Adding New MCP Tools or Resources

When adding new MCP tools or resources:

1. Create a new file in the appropriate directory (`src/mcp_tools` or `src/mcp_resources`)
2. Implement the tool or resource following the existing patterns
3. Add proper error handling and logging
4. Write comprehensive tests
5. Update the documentation to include the new tool or resource
6. Register the tool or resource in the appropriate index file

## Reporting Bugs

When reporting bugs:

1. Use the GitHub issue tracker
2. Describe the bug in detail
3. Include steps to reproduce the bug
4. Include information about your environment (OS, Node.js version, etc.)
5. If possible, provide a minimal code example that reproduces the bug

## Feature Requests

Feature requests are welcome. Please use the GitHub issue tracker and:

1. Clearly describe the feature
2. Explain why it would be valuable
3. Consider how it fits into the existing architecture

## Questions

If you have questions about the project, please:

1. Check the documentation first
2. Search for existing issues that might address your question
3. If you still need help, create a new issue with your question

Thank you for contributing to the MAAS MCP Server!