// Package ui renders the installer's console conversation: prompts, defaults
// and progress. Deliberately plain text so it works in cmd.exe and over ssh.
package ui

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

var in = bufio.NewReader(os.Stdin)

// Step prints a numbered section header.
func Step(n int, title string) { fmt.Printf("\n[%d] %s\n%s\n", n, title, strings.Repeat("-", 60)) }

// Info prints an indented status line.
func Info(format string, a ...any) { fmt.Printf("    "+format+"\n", a...) }

// OK prints a success line.
func OK(format string, a ...any) { fmt.Printf("  + "+format+"\n", a...) }

// Warn prints a non-fatal problem.
func Warn(format string, a ...any) { fmt.Printf("  ! "+format+"\n", a...) }

// Fail prints an error and exits with status 1.
func Fail(format string, a ...any) {
	fmt.Fprintf(os.Stderr, "\n  x "+format+"\n", a...)
	os.Exit(1)
}

// Ask reads a line, returning def when the user just presses enter.
func Ask(question, def string) string {
	if def != "" {
		fmt.Printf("  ? %s [%s]: ", question, def)
	} else {
		fmt.Printf("  ? %s: ", question)
	}
	line, _ := in.ReadString('\n')
	line = strings.TrimSpace(line)
	if line == "" {
		return def
	}
	return line
}

// AskRequired loops until the user supplies a non-empty value.
func AskRequired(question string) string {
	for {
		if v := Ask(question, ""); v != "" {
			return v
		}
		Warn("This value is required.")
	}
}

// Confirm asks a yes/no question.
func Confirm(question string, def bool) bool {
	hint := "y/N"
	if def {
		hint = "Y/n"
	}
	for {
		fmt.Printf("  ? %s [%s]: ", question, hint)
		line, _ := in.ReadString('\n')
		switch strings.ToLower(strings.TrimSpace(line)) {
		case "":
			return def
		case "y", "yes":
			return true
		case "n", "no":
			return false
		}
	}
}
