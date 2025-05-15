package version

// Version information
const (
	// Version is the current version of the MCP server
	Version = "1.1.0"
)

// GetVersion returns the current version of the MCP server
func GetVersion() string {
	return Version
}
