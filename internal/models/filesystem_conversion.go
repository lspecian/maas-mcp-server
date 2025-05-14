package models

// MaasFilesystemToMCPContext converts a MAAS Filesystem to MCP FilesystemContext
func MaasFilesystemToMCPContext(fs *Filesystem) *FilesystemContext {
	if fs == nil {
		return nil
	}

	return &FilesystemContext{
		Type:         fs.FSType,
		UUID:         fs.UUID,
		MountPoint:   fs.MountPoint,
		MountOptions: fs.MountOptions,
	}
}

// MCPFilesystemContextToMaas converts an MCP FilesystemContext to MAAS Filesystem
func MCPFilesystemContextToMaas(fs *FilesystemContext) *Filesystem {
	if fs == nil {
		return nil
	}

	return &Filesystem{
		FSType:       fs.Type,
		UUID:         fs.UUID,
		MountPoint:   fs.MountPoint,
		MountOptions: fs.MountOptions,
	}
}
