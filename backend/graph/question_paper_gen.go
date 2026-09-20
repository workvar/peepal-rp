package graph

// Question-paper generation. Deliberately a pure function over an in-memory
// pool: no DB, no context, no auth. That keeps the selection rules readable
// and lets question_paper_gen_test.go exercise them directly.

import (
	"errors"
	"math/rand"
	"sort"
	"strings"

	"collegeerp/models"
)

// PaperRule is the blueprint a paper is generated from. Every field is
// optional except TotalMarks — an empty rule means "fill to total marks from
// anywhere in the pool".
type PaperRule struct {
	CurriculumSubjectID string
	TotalMarks          float64
	// ByDifficulty is a marks target per bucket, e.g. {"easy":20,"medium":50,
	// "hard":30}. When empty, difficulty is ignored and the generator fills
	// straight to TotalMarks.
	ByDifficulty map[string]float64
	// UnitSpread restricts selection to these syllabus units. Empty = all.
	// Within a bucket the generator round-robins across units so one chapter
	// cannot swallow the whole paper.
	UnitSpread []string
	// TypeMix caps how many questions of each shape may appear, e.g.
	// {"mcq":10,"long":5}. A shape absent from a non-empty map is excluded.
	TypeMix map[string]int
}

// sectionForType groups question shapes into the printed sections. MCQs lead
// (Section A), short answers follow, long/numeric close the paper — the
// conventional ordering for an Indian university paper.
func sectionForType(qType string) string {
	switch qType {
	case models.QTypeMCQ:
		return "A"
	case models.QTypeShort:
		return "B"
	default:
		return "C"
	}
}

// sectionRank orders sections for the final sort.
func sectionRank(section string) int {
	switch section {
	case "A":
		return 0
	case "B":
		return 1
	default:
		return 2
	}
}

// buildPaper selects questions from pool to satisfy rule as closely as the
// pool allows, and returns them in print order.
//
// The algorithm is a greedy fill per difficulty bucket, with a round-robin
// across units inside each bucket:
//
//  1. Filter the pool to active questions that pass the unit and type-mix
//     filters.
//  2. For each difficulty bucket with a marks target, walk units in rotation
//     taking one question at a time until the bucket's target is met (or the
//     bucket runs dry).
//  3. If the rule had no difficulty targets, treat the whole pool as one
//     bucket targeting TotalMarks.
//  4. Sort the result into sections and number it.
//
// Selection is seeded, so the same (pool, rule, seed) always yields the same
// paper — "regenerate this exact paper" and "give me a different set for
// section B" are both one seed away.
func buildPaper(pool []models.QuestionBankItem, rule PaperRule, seed int64) ([]models.QuestionPaperItem, error) {
	if rule.TotalMarks <= 0 {
		return nil, errors.New("total marks must be greater than zero")
	}

	candidates := filterPool(pool, rule)
	if len(candidates) == 0 {
		return nil, errors.New("no questions in the bank match this rule — add questions or widen the units/difficulty")
	}

	rng := rand.New(rand.NewSource(seed))
	// used guards against the same question appearing twice across buckets.
	used := map[string]bool{}
	var picked []models.QuestionBankItem

	targets := rule.ByDifficulty
	if len(targets) == 0 {
		// No difficulty spread requested: one anonymous bucket for everything.
		picked = fillBucket(candidates, used, rule.TotalMarks, rng)
	} else {
		// Deterministic bucket order — map iteration order is random in Go, and
		// a paper that changes shape between identical runs is not reproducible.
		for _, difficulty := range models.QuestionDifficulties {
			target, ok := targets[difficulty]
			if !ok || target <= 0 {
				continue
			}
			bucket := byDifficulty(candidates, difficulty)
			picked = append(picked, fillBucket(bucket, used, target, rng)...)
		}
	}

	// Top up from whatever is left if the buckets underfilled the paper (a
	// thin "hard" pool shouldn't leave the paper 30 marks short).
	if total := sumMarks(picked); total < rule.TotalMarks {
		picked = append(picked, fillBucket(candidates, used, rule.TotalMarks-total, rng)...)
	}

	if len(picked) == 0 {
		return nil, errors.New("could not select any questions for this rule")
	}
	return toPaperItems(picked), nil
}

// filterPool applies the rule's unit and type-mix restrictions and drops
// inactive questions.
func filterPool(pool []models.QuestionBankItem, rule PaperRule) []models.QuestionBankItem {
	unitAllowed := stringSet(rule.UnitSpread)
	remainingByType := map[string]int{}
	for k, v := range rule.TypeMix {
		remainingByType[normalizeQuestionType(k)] = v
	}

	out := make([]models.QuestionBankItem, 0, len(pool))
	for _, q := range pool {
		if !q.Active || q.Marks <= 0 {
			continue
		}
		if len(unitAllowed) > 0 && !unitAllowed[strings.TrimSpace(q.Unit)] {
			continue
		}
		if len(remainingByType) > 0 {
			left, ok := remainingByType[q.QuestionType]
			if !ok || left <= 0 {
				continue
			}
			remainingByType[q.QuestionType] = left - 1
		}
		out = append(out, q)
	}
	return out
}

// byDifficulty narrows a candidate list to one bucket.
func byDifficulty(pool []models.QuestionBankItem, difficulty string) []models.QuestionBankItem {
	out := make([]models.QuestionBankItem, 0, len(pool))
	for _, q := range pool {
		if q.Difficulty == difficulty {
			out = append(out, q)
		}
	}
	return out
}

// fillBucket takes questions until target marks are met, rotating across units
// so the selection spreads over the syllabus instead of clustering in whichever
// unit happens to have the most questions.
func fillBucket(
	bucket []models.QuestionBankItem,
	used map[string]bool,
	target float64,
	rng *rand.Rand,
) []models.QuestionBankItem {
	units, byUnit := groupByUnit(bucket, used, rng)

	var picked []models.QuestionBankItem
	var total float64
	// Rotate: one question per unit per pass, until the target is met or every
	// unit is exhausted.
	for progressed := true; progressed && total < target; {
		progressed = false
		for _, unit := range units {
			if total >= target {
				break
			}
			queue := byUnit[unit]
			if len(queue) == 0 {
				continue
			}
			q := queue[0]
			byUnit[unit] = queue[1:]
			progressed = true

			// Skip a question that would overshoot the target, unless we have
			// nothing yet — a 10-mark question should not be dropped just
			// because only 6 marks remain on an empty bucket.
			if total+q.Marks > target && total > 0 {
				continue
			}
			used[q.ID] = true
			picked = append(picked, q)
			total += q.Marks
		}
	}
	return picked
}

// groupByUnit buckets questions by unit and shuffles each queue, returning the
// unit labels in a stable (sorted) order so rotation is reproducible.
func groupByUnit(
	pool []models.QuestionBankItem,
	used map[string]bool,
	rng *rand.Rand,
) ([]string, map[string][]models.QuestionBankItem) {
	byUnit := map[string][]models.QuestionBankItem{}
	for _, q := range pool {
		if used[q.ID] {
			continue
		}
		unit := strings.TrimSpace(q.Unit)
		byUnit[unit] = append(byUnit[unit], q)
	}

	units := make([]string, 0, len(byUnit))
	for unit := range byUnit {
		units = append(units, unit)
	}
	sort.Strings(units)

	for _, unit := range units {
		queue := byUnit[unit]
		rng.Shuffle(len(queue), func(i, j int) { queue[i], queue[j] = queue[j], queue[i] })
		byUnit[unit] = queue
	}
	return units, byUnit
}

// toPaperItems sorts the selection into printed sections and numbers it.
func toPaperItems(picked []models.QuestionBankItem) []models.QuestionPaperItem {
	sort.SliceStable(picked, func(i, j int) bool {
		si := sectionRank(sectionForType(picked[i].QuestionType))
		sj := sectionRank(sectionForType(picked[j].QuestionType))
		if si != sj {
			return si < sj
		}
		// Within a section, lighter questions first — the usual paper shape.
		if picked[i].Marks != picked[j].Marks {
			return picked[i].Marks < picked[j].Marks
		}
		return picked[i].Unit < picked[j].Unit
	})

	items := make([]models.QuestionPaperItem, len(picked))
	for i, q := range picked {
		items[i] = models.QuestionPaperItem{
			SourceQuestionID: q.ID,
			SeqNo:            i + 1,
			QuestionText:     q.QuestionText,
			QuestionType:     q.QuestionType,
			Marks:            q.Marks,
			Options:          q.Options,
			Section:          sectionForType(q.QuestionType),
		}
	}
	return items
}

// sumMarks totals a selection.
func sumMarks(items []models.QuestionBankItem) float64 {
	var total float64
	for _, q := range items {
		total += q.Marks
	}
	return total
}

// stringSet builds a trimmed lookup set, ignoring blanks.
func stringSet(values []string) map[string]bool {
	out := map[string]bool{}
	for _, v := range values {
		if s := strings.TrimSpace(v); s != "" {
			out[s] = true
		}
	}
	return out
}
