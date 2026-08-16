//go:build windows

package main

// serviceUser is empty on Windows: the service identity applies to children.
func serviceUser() string { return "" }
