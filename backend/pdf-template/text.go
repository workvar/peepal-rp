package pdftemplate

// Shared text + currency helpers for the PDF builders. The renderer uses only
// the core Helvetica fonts (no embedded TTF), so all text is reduced to
// printable ASCII and currency is prefixed with "Rs." rather than the rupee
// glyph, which the core fonts cannot draw.

import (
	"fmt"
	"strings"
)

// ascii strips text to printable ASCII, swapping common smart punctuation for
// plain equivalents so nothing renders as a missing-glyph box.
func ascii(s string) string {
	repl := strings.NewReplacer(
		"‘", "'", "’", "'", // curly single quotes
		"“", `"`, "”", `"`, // curly double quotes
		"–", "-", "—", "-", // en/em dash
		"•", "*", "·", "*", // bullets
		"₹", "Rs.", // rupee sign
	)
	s = repl.Replace(s)
	var b strings.Builder
	for _, r := range s {
		if r >= 0x20 && r <= 0x7E {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// fallback returns "-" for empty strings so labels never render blank.
func fallback(s string) string {
	if s == "" {
		return "-"
	}
	return s
}

// currencyPrefix maps a currency code to an ASCII-safe prefix.
func currencyPrefix(currency string) string {
	switch currency {
	case "USD":
		return "$ "
	case "EUR":
		return "EUR "
	case "GBP":
		return "GBP "
	default:
		return "Rs. "
	}
}

// money formats an amount with two decimals and a currency prefix (used by the
// payslip, which shows exact pay figures).
func money(amount float64, currency string) string {
	return fmt.Sprintf("%s%.2f", currencyPrefix(currency), amount)
}

// rupees formats an amount as "Rs. 1,23,456" using Indian digit grouping and no
// decimals for whole numbers. Mirrors the fee PDFs' old en-IN formatting.
func rupees(amount float64) string {
	return "Rs. " + indianGroup(amount)
}

// indianGroup applies Indian place-value grouping (last 3 digits, then pairs).
func indianGroup(amount float64) string {
	neg := amount < 0
	if neg {
		amount = -amount
	}
	// Round to 2 decimals, drop a trailing ".00".
	whole := int64(amount)
	frac := int64((amount-float64(whole))*100 + 0.5)
	if frac >= 100 {
		whole++
		frac = 0
	}

	digits := fmt.Sprintf("%d", whole)
	var grouped string
	if len(digits) <= 3 {
		grouped = digits
	} else {
		last3 := digits[len(digits)-3:]
		rest := digits[:len(digits)-3]
		var parts []string
		for len(rest) > 2 {
			parts = append([]string{rest[len(rest)-2:]}, parts...)
			rest = rest[:len(rest)-2]
		}
		if rest != "" {
			parts = append([]string{rest}, parts...)
		}
		grouped = strings.Join(parts, ",") + "," + last3
	}

	out := grouped
	if frac > 0 {
		out += fmt.Sprintf(".%02d", frac)
	}
	if neg {
		out = "-" + out
	}
	return out
}
