// Package semver implements just enough of semantic versioning to compare
// GitHub release tags. Tags may be prefixed with "v".
package semver

import (
	"strconv"
	"strings"
)

// Version is a parsed tag.
type Version struct {
	Major, Minor, Patch int
	Pre                 string
	Raw                 string
}

// Parse reads a tag such as "v1.2.3" or "1.2.3-beta.1". Missing components
// default to zero, so "v2" parses as 2.0.0.
func Parse(tag string) Version {
	v := Version{Raw: tag}
	s := strings.TrimPrefix(strings.TrimSpace(tag), "v")
	if i := strings.IndexAny(s, "-+"); i >= 0 {
		v.Pre, s = strings.TrimLeft(s[i:], "-+"), s[:i]
	}
	parts := strings.Split(s, ".")
	nums := []*int{&v.Major, &v.Minor, &v.Patch}
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(parts[i])
		if err != nil {
			break
		}
		*nums[i] = n
	}
	return v
}

// IsPre reports whether the tag carries a prerelease suffix.
func (v Version) IsPre() bool { return v.Pre != "" }

// Compare returns -1, 0 or 1 for v against o. A prerelease sorts before the
// equivalent release (1.2.0-rc1 < 1.2.0).
func (v Version) Compare(o Version) int {
	for _, p := range [][2]int{{v.Major, o.Major}, {v.Minor, o.Minor}, {v.Patch, o.Patch}} {
		if p[0] != p[1] {
			return sign(p[0] - p[1])
		}
	}
	switch {
	case v.Pre == o.Pre:
		return 0
	case v.Pre == "":
		return 1
	case o.Pre == "":
		return -1
	case v.Pre < o.Pre:
		return -1
	default:
		return 1
	}
}

// Newer reports whether tag a is strictly newer than tag b.
func Newer(a, b string) bool { return Parse(a).Compare(Parse(b)) > 0 }

func sign(n int) int {
	if n < 0 {
		return -1
	}
	return 1
}
