# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-05-15

### Changed
- Renamed binary from `mcp-server-clean` to `maas-mcp-server` for better clarity
- Updated build script to use the new binary name
- Updated GitHub Actions release workflow to build from the clean architecture source
- Updated README with information about configuring the server with `.roo/mcp.json`
- Added more details about environment variables and their default values
- Added information about building for different platforms (Linux and Mac ARM)

### Fixed
- Fixed environment variable handling in the configuration

## [1.0.0] - 2025-05-01

### Added
- Initial release of the MAAS MCP Server
- Support for listing machines with filtering
- Support for getting machine details
- Support for powering on/off machines
- Support for HTTP and stdin/stdout transport modes