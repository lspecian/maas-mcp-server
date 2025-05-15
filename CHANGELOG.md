# Changelog

All notable changes to the MAAS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflow for automated multi-platform releases
- Centralized version management with `internal/version` package
- Version flag (`--version`) to display the current version

### Changed
- Replaced hardcoded version strings with references to the centralized version

### Fixed
- Consistent version reporting across all components

## [1.0.0] - 2025-05-15

### Added
- Initial release of the MAAS MCP Server
- Support for MAAS API integration
- Model Context Protocol (MCP) implementation
- Machine management capabilities
- Network configuration support
- Storage management features
- Tag operations