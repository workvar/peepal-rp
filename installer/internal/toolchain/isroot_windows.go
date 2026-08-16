package toolchain

// isRoot is meaningless on Windows; elevation is handled by the manifest that
// asks for administrator rights when the panel starts.
func isRoot() bool { return true }
