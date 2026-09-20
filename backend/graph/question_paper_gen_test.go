package graph

// Tests for the paper generator. buildPaper is pure, so these need no DB —
// they build a pool in memory and assert on the selection.

import (
	"testing"

	"collegeerp/models"
)

// pool builds a predictable bank: 3 units x 3 difficulties x 2 questions,
// with marks that make the arithmetic easy to reason about.
func testPool() []models.QuestionBankItem {
	marksFor := map[string]float64{
		models.QDifficultyEasy:   2,
		models.QDifficultyMedium: 5,
		models.QDifficultyHard:   10,
	}
	types := map[string]string{
		models.QDifficultyEasy:   models.QTypeMCQ,
		models.QDifficultyMedium: models.QTypeShort,
		models.QDifficultyHard:   models.QTypeLong,
	}

	var pool []models.QuestionBankItem
	units := []string{"Unit 1", "Unit 2", "Unit 3"}
	for _, unit := range units {
		for _, difficulty := range models.QuestionDifficulties {
			for i := 0; i < 2; i++ {
				pool = append(pool, models.QuestionBankItem{
					ID:           unit + "-" + difficulty + "-" + string(rune('a'+i)),
					Unit:         unit,
					Difficulty:   difficulty,
					QuestionType: types[difficulty],
					Marks:        marksFor[difficulty],
					QuestionText: unit + " " + difficulty,
					Active:       true,
				})
			}
		}
	}
	return pool
}

func totalMarks(items []models.QuestionPaperItem) float64 {
	var t float64
	for _, i := range items {
		t += i.Marks
	}
	return t
}

func TestBuildPaperHitsDifficultySpread(t *testing.T) {
	rule := PaperRule{
		TotalMarks: 40,
		ByDifficulty: map[string]float64{
			models.QDifficultyEasy:   10,
			models.QDifficultyMedium: 10,
			models.QDifficultyHard:   20,
		},
	}
	items, err := buildPaper(testPool(), rule, 42)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}

	if got := totalMarks(items); got != 40 {
		t.Errorf("total marks = %v, want 40", got)
	}

	// Each bucket should contribute its target. Marks are unique per
	// difficulty in the fixture, so they identify the bucket.
	byMarks := map[float64]float64{}
	for _, i := range items {
		byMarks[i.Marks] += i.Marks
	}
	for marks, want := range map[float64]float64{2: 10, 5: 10, 10: 20} {
		if byMarks[marks] != want {
			t.Errorf("bucket with %v-mark questions contributed %v, want %v", marks, byMarks[marks], want)
		}
	}
}

func TestBuildPaperRespectsUnitFilter(t *testing.T) {
	rule := PaperRule{
		TotalMarks: 20,
		UnitSpread: []string{"Unit 2"},
	}
	items, err := buildPaper(testPool(), rule, 7)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least one question")
	}

	// Every selected question must have come from Unit 2. The item has no unit
	// field, so check the text the fixture wrote.
	for _, i := range items {
		if got := i.QuestionText[:6]; got != "Unit 2" {
			t.Errorf("question from %q leaked past the unit filter", got)
		}
	}
}

func TestBuildPaperIsDeterministicForAFixedSeed(t *testing.T) {
	rule := PaperRule{
		TotalMarks:   30,
		ByDifficulty: map[string]float64{models.QDifficultyMedium: 15, models.QDifficultyHard: 15},
	}

	first, err := buildPaper(testPool(), rule, 99)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}
	second, err := buildPaper(testPool(), rule, 99)
	if err != nil {
		t.Fatalf("buildPaper (rerun): %v", err)
	}

	if len(first) != len(second) {
		t.Fatalf("same seed produced %d then %d questions", len(first), len(second))
	}
	for i := range first {
		if first[i].SourceQuestionID != second[i].SourceQuestionID {
			t.Fatalf("position %d differs between runs: %s vs %s",
				i, first[i].SourceQuestionID, second[i].SourceQuestionID)
		}
	}
}

func TestBuildPaperSpreadsAcrossUnits(t *testing.T) {
	// 3 easy questions' worth of marks, drawn from a pool where each unit has
	// two easy questions — a generator that ignored units could take both from
	// Unit 1. The round-robin must touch all three.
	rule := PaperRule{
		TotalMarks:   6,
		ByDifficulty: map[string]float64{models.QDifficultyEasy: 6},
	}
	items, err := buildPaper(testPool(), rule, 3)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}

	units := map[string]bool{}
	for _, i := range items {
		units[i.QuestionText[:6]] = true
	}
	if len(units) != 3 {
		t.Errorf("questions came from %d units, want 3 (%v)", len(units), units)
	}
}

func TestBuildPaperNumbersAndSectionsInOrder(t *testing.T) {
	items, err := buildPaper(testPool(), PaperRule{TotalMarks: 30}, 11)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}

	lastRank := -1
	for i, item := range items {
		if item.SeqNo != i+1 {
			t.Errorf("item %d has SeqNo %d, want %d", i, item.SeqNo, i+1)
		}
		if rank := sectionRank(item.Section); rank < lastRank {
			t.Errorf("section %q at position %d breaks A→B→C ordering", item.Section, i)
		} else {
			lastRank = rank
		}
	}
}

func TestBuildPaperRejectsAnEmptyPool(t *testing.T) {
	if _, err := buildPaper(nil, PaperRule{TotalMarks: 10}, 1); err == nil {
		t.Error("expected an error when the bank has no matching questions")
	}
}

func TestBuildPaperSkipsInactiveQuestions(t *testing.T) {
	pool := testPool()
	for i := range pool {
		pool[i].Active = false
	}
	if _, err := buildPaper(pool, PaperRule{TotalMarks: 10}, 1); err == nil {
		t.Error("expected an error when every question is retired")
	}
}

func TestBuildPaperHonoursTypeMix(t *testing.T) {
	// Cap the paper at 2 MCQs; the fixture has 6.
	rule := PaperRule{
		TotalMarks: 50,
		TypeMix:    map[string]int{models.QTypeMCQ: 2},
	}
	items, err := buildPaper(testPool(), rule, 5)
	if err != nil {
		t.Fatalf("buildPaper: %v", err)
	}

	var mcqs int
	for _, i := range items {
		if i.QuestionType == models.QTypeMCQ {
			mcqs++
		}
	}
	if mcqs > 2 {
		t.Errorf("paper has %d MCQs, want at most 2", mcqs)
	}
}
