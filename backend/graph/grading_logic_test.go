package graph

import (
	"testing"

	"collegeerp/models"
)

func tenPointScheme() models.GradingScheme {
	return models.GradingScheme{Bands: defaultBands("s", "t")}
}

func TestGradingBandFor(t *testing.T) {
	s := tenPointScheme()
	cases := []struct {
		pct  float64
		want string
	}{
		{100, "O"}, {90, "O"}, {89.99, "A+"}, {80, "A+"}, {75, "A"},
		{60, "B+"}, {50, "B"}, {40, "C"}, {39.99, "F"}, {0, "F"},
	}
	for _, c := range cases {
		if got := bandFor(s, c.pct).Letter; got != c.want {
			t.Errorf("bandFor(%.2f) = %q, want %q", c.pct, got, c.want)
		}
	}
}

func TestSubjectPercentageSimpleTotal(t *testing.T) {
	// No weights → simple sum(obtained)/sum(max): 120/160 = 75.
	items := []gradeAssessment{{18, 20, 0}, {32, 40, 0}, {70, 100, 0}}
	if got := subjectPercentage(items); got != 75 {
		t.Errorf("simple = %v, want 75", got)
	}
}

func TestSubjectPercentageWeighted(t *testing.T) {
	// All weighted → weighted avg of each item's %: 90*0.2+80*0.3+70*0.5 = 77.
	items := []gradeAssessment{{18, 20, 20}, {32, 40, 30}, {70, 100, 50}}
	if got := subjectPercentage(items); got != 77 {
		t.Errorf("weighted = %v, want 77", got)
	}
}

func TestSubjectPercentagePartialWeightFallsBack(t *testing.T) {
	// A missing weight forces the simple-total fallback: 50/60.
	// Use runtime vars (not constants) so float64 rounding matches the function.
	items := []gradeAssessment{{18, 20, 20}, {32, 40, 0}}
	o, m := 50.0, 60.0
	want := o / m * 100
	if got := subjectPercentage(items); got != want {
		t.Errorf("partial = %v, want %v", got, want)
	}
}

func TestRoundTo(t *testing.T) {
	if got := roundTo(8.126, 2); got != 8.13 {
		t.Errorf("roundTo(8.126,2) = %v, want 8.13", got)
	}
	if got := roundTo(9.111, 1); got != 9.1 {
		t.Errorf("roundTo(9.111,1) = %v, want 9.1", got)
	}
}
