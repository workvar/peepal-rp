package graph

import "strings"

// genderAllowedInBlock enforces hostel gender rules: a boys block admits only
// male students, a girls block only female; mixed/co-ed (or any unrecognised
// type) admits anyone. Unknown student gender is allowed only into mixed blocks.
func genderAllowedInBlock(blockType, gender string) bool {
	g := strings.ToLower(strings.TrimSpace(gender))
	isMale := g == "male" || g == "m" || g == "boy"
	isFemale := g == "female" || g == "f" || g == "girl" || g == "woman"
	switch strings.ToLower(strings.TrimSpace(blockType)) {
	case "boys", "boy", "male", "men", "gents":
		return isMale
	case "girls", "girl", "female", "women", "ladies":
		return isFemale
	default: // mixed / co-ed / unspecified
		return true
	}
}

// blockGenderError is the message shown when a student's gender doesn't match
// the block.
func blockGenderError(blockType string) string {
	switch strings.ToLower(strings.TrimSpace(blockType)) {
	case "boys", "boy", "male", "men", "gents":
		return "this is a boys' block — only male students can be allocated here"
	case "girls", "girl", "female", "women", "ladies":
		return "this is a girls' block — only female students can be allocated here"
	default:
		return "student is not eligible for this block"
	}
}
