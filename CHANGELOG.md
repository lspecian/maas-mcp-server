# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-05-15

### Fixed
- Fixed support for tools/call method in MCP server according to the MCP protocol standard
- Fixed issue where the server was expecting the method name to be the tool name directly
- Added tools_call_handler.go with implementation of the handler
- Modified stdio.go to check for tools/call method before looking up tools directly

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