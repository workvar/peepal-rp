package graph

import (
	"context"
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"collegeerp/graph/model"
	"collegeerp/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// gradeAssessment is one entered mark contributing to a subject's final score.
type gradeAssessment struct {
	obtained float64
	max      float64
	weight   float64 // matched exam-type weightage, 0 when none
}

// loadOrCreateScheme fetches the tenant's grading scheme (bands ordered), seeding
// a default 10-point Indian scale the first time it is requested.
func loadOrCreateScheme(ctx context.Context, db *gorm.DB, tenantID string) (models.GradingScheme, error) {
	var scheme models.GradingScheme
	err := db.WithContext(ctx).
		Preload("Bands", func(d *gorm.DB) *gorm.DB { return d.Order("sort_order ASC, min_percent DESC") }).
		Where("tenant_id = ?", tenantID).
		First(&scheme).Error
	if err == nil {
		return scheme, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return scheme, err
	}

	scheme = models.GradingScheme{
		ID:                 uuid.NewString(),
		TenantID:           tenantID,
		Mode:               "cgpa",
		GpaMax:             10,
		PassThreshold:      40,
		Decimals:           2,
		CreditWeighted:     true,
		WeightedByExamType: true,
	}
	if err := db.WithContext(ctx).Create(&scheme).Error; err != nil {
		// A concurrent request may have seeded it first (TenantID is unique).
		var existing models.GradingScheme
		if e2 := db.WithContext(ctx).
			Preload("Bands", func(d *gorm.DB) *gorm.DB { return d.Order("sort_order ASC, min_percent DESC") }).
			Where("tenant_id = ?", tenantID).First(&existing).Error; e2 == nil {
			return existing, nil
		}
		return scheme, err
	}
	for _, b := range defaultBands(scheme.ID, tenantID) {
		if err := db.WithContext(ctx).Create(&b).Error; err != nil {
			return scheme, err
		}
		scheme.Bands = append(scheme.Bands, b)
	}
	return scheme, nil
}

// defaultBands is the 10-point Indian scale seeded for a new tenant.
func defaultBands(schemeID, tenantID string) []models.GradeBand {
	rows := []struct {
		letter   string
		min, max float64
		gp       float64
		pass     bool
	}{
		{"O", 90, 100, 10, true},
		{"A+", 80, 89, 9, true},
		{"A", 70, 79, 8, true},
		{"B+", 60, 69, 7, true},
		{"B", 50, 59, 6, true},
		{"C", 40, 49, 5, true},
		{"F", 0, 39, 0, false},
	}
	out := make([]models.GradeBand, len(rows))
	for i, r := range rows {
		out[i] = models.GradeBand{
			ID:         uuid.NewString(),
			SchemeID:   schemeID,
			TenantID:   tenantID,
			Letter:     r.letter,
			MinPercent: r.min,
			MaxPercent: r.max,
			GradePoint: r.gp,
			IsPass:     r.pass,
			SortOrder:  i,
		}
	}
	return out
}

// computeAcademicResult builds the full result for a student from their
// published marks, applying the scheme's weighting rules.
func computeAcademicResult(ctx context.Context, db *gorm.DB, tenantID string, student models.Student, scheme models.GradingScheme) (*model.AcademicResult, error) {
	var marks []models.Mark
	if err := db.WithContext(ctx).
		Where("tenant_id = ? AND student_id = ? AND is_published = ?", tenantID, student.ID, true).
		Find(&marks).Error; err != nil {
		return nil, err
	}

	weightByName := map[string]float64{}
	if scheme.WeightedByExamType {
		var ets []models.ExamType
		db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&ets)
		for _, et := range ets {
			if et.Weightage > 0 {
				weightByName[normKey(et.Name)] = et.Weightage
			}
		}
	}

	creditByID := map[string]int{}
	creditByName := map[string]int{}
	var subs []models.Subject
	db.WithContext(ctx).Where("tenant_id = ?", tenantID).Find(&subs)
	for _, s := range subs {
		creditByID[s.ID] = s.Credits
		creditByName[normKey(s.Name)] = s.Credits
	}

	type subjAgg struct {
		subjectID string
		name      string
		credits   int
		items     []gradeAssessment
	}

	grouped := map[int]map[string]*subjAgg{}
	semSeen := map[int]bool{}
	var semns []int

	for _, m := range marks {
		if !semSeen[m.Semester] {
			semSeen[m.Semester] = true
			semns = append(semns, m.Semester)
		}
		if grouped[m.Semester] == nil {
			grouped[m.Semester] = map[string]*subjAgg{}
		}
		key := m.SubjectID
		if key == "" {
			key = "name:" + normKey(m.Subject)
		}
		agg := grouped[m.Semester][key]
		if agg == nil {
			credits := 0
			if m.SubjectID != "" {
				credits = creditByID[m.SubjectID]
			}
			if credits == 0 {
				credits = creditByName[normKey(m.Subject)]
			}
			if credits <= 0 {
				credits = 1
			}
			agg = &subjAgg{subjectID: m.SubjectID, name: m.Subject, credits: credits}
			grouped[m.Semester][key] = agg
		}
		w := 0.0
		if scheme.WeightedByExamType {
			if v, ok := weightByName[normKey(m.AssessmentType)]; ok {
				w = v
			} else if v, ok := weightByName[normKey(m.ExamType)]; ok {
				w = v
			}
		}
		agg.items = append(agg.items, gradeAssessment{obtained: m.MarksObtained, max: m.MaxMarks, weight: w})
	}

	sort.Ints(semns)

	var (
		semResults        []*model.SemesterResult
		cumGPxCred        float64
		cumCred           float64
		cumPctxCred       float64
		cumObt            float64
		cumMax            float64
		grandTotalCredits int
		allSemPass        = true
	)

	for _, sem := range semns {
		subjMap := grouped[sem]
		keys := make([]string, 0, len(subjMap))
		for k := range subjMap {
			keys = append(keys, k)
		}
		sort.Slice(keys, func(i, j int) bool {
			return strings.ToLower(subjMap[keys[i]].name) < strings.ToLower(subjMap[keys[j]].name)
		})

		var (
			subjResults     []*model.SubjectResult
			semGPxCred      float64
			semCred         float64
			semPctxCred     float64
			semObt          float64
			semMax          float64
			semTotalCredits int
			semPass         = true
		)

		for _, k := range keys {
			agg := subjMap[k]
			pct := subjectPercentage(agg.items)
			var rawObt, rawMax float64
			for _, it := range agg.items {
				rawObt += it.obtained
				rawMax += it.max
			}
			band := bandFor(scheme, pct)
			isPass := band.IsPass && pct >= scheme.PassThreshold

			var sidPtr *string
			if agg.subjectID != "" {
				sid := agg.subjectID
				sidPtr = &sid
			}
			subjResults = append(subjResults, &model.SubjectResult{
				SubjectID:     sidPtr,
				Subject:       agg.name,
				Credits:       agg.credits,
				MarksObtained: roundTo(rawObt, 2),
				MaxMarks:      roundTo(rawMax, 2),
				Percentage:    roundTo(pct, scheme.Decimals),
				Letter:        band.Letter,
				GradePoint:    band.GradePoint,
				IsPass:        isPass,
			})

			c := float64(agg.credits)
			semGPxCred += band.GradePoint * c
			semCred += c
			semPctxCred += pct * c
			semObt += rawObt
			semMax += rawMax
			semTotalCredits += agg.credits
			if !isPass {
				semPass = false
			}
		}

		sgpa, semPct := 0.0, 0.0
		if scheme.CreditWeighted {
			if semCred > 0 {
				sgpa = semGPxCred / semCred
				semPct = semPctxCred / semCred
			}
		} else if n := float64(len(subjResults)); n > 0 {
			var gpSum, pctSum float64
			for _, sr := range subjResults {
				gpSum += sr.GradePoint
				pctSum += sr.Percentage
			}
			sgpa = gpSum / n
			semPct = pctSum / n
		}

		semResults = append(semResults, &model.SemesterResult{
			Semester:      sem,
			Subjects:      subjResults,
			TotalCredits:  semTotalCredits,
			MarksObtained: roundTo(semObt, 2),
			MaxMarks:      roundTo(semMax, 2),
			Percentage:    roundTo(semPct, scheme.Decimals),
			Sgpa:          roundTo(sgpa, scheme.Decimals),
			Letter:        bandFor(scheme, semPct).Letter,
			IsPass:        semPass,
		})

		cumGPxCred += semGPxCred
		cumCred += semCred
		cumPctxCred += semPctxCred
		cumObt += semObt
		cumMax += semMax
		grandTotalCredits += semTotalCredits
		if !semPass {
			allSemPass = false
		}
	}

	cgpa, overallPct := 0.0, 0.0
	if scheme.CreditWeighted {
		if cumCred > 0 {
			cgpa = cumGPxCred / cumCred
			overallPct = cumPctxCred / cumCred
		}
	} else {
		var gpSum, pctSum, n float64
		for _, sem := range semResults {
			for _, sr := range sem.Subjects {
				gpSum += sr.GradePoint
				pctSum += sr.Percentage
				n++
			}
		}
		if n > 0 {
			cgpa = gpSum / n
			overallPct = pctSum / n
		}
	}

	hasResults := len(semResults) > 0

	return &model.AcademicResult{
		StudentID:     student.ID,
		StudentName:   student.User.Name,
		RollNumber:    student.RollNumber,
		CourseName:    student.Course.Name,
		Mode:          scheme.Mode,
		GpaMax:        scheme.GpaMax,
		Semesters:     semResults,
		TotalCredits:  grandTotalCredits,
		MarksObtained: roundTo(cumObt, 2),
		MaxMarks:      roundTo(cumMax, 2),
		Percentage:    roundTo(overallPct, scheme.Decimals),
		Cgpa:          roundTo(cgpa, scheme.Decimals),
		Letter:        bandFor(scheme, overallPct).Letter,
		IsPass:        hasResults && allSemPass,
		GeneratedAt:   time.Now().Format(time.RFC3339),
	}, nil
}

// subjectPercentage combines a subject's assessments. When every assessment has
// a matched exam-type weightage it returns their weighted average; otherwise it
// falls back to a simple obtained/max total.
func subjectPercentage(items []gradeAssessment) float64 {
	if len(items) == 0 {
		return 0
	}
	allWeighted := true
	var wsum, wpsum, obt, max float64
	for _, it := range items {
		obt += it.obtained
		max += it.max
		if it.weight > 0 && it.max > 0 {
			wpsum += (it.obtained / it.max * 100) * it.weight
			wsum += it.weight
		} else {
			allWeighted = false
		}
	}
	if allWeighted && wsum > 0 {
		return wpsum / wsum
	}
	if max > 0 {
		return obt / max * 100
	}
	return 0
}

// bandFor returns the grade band a percentage falls into: the band with the
// highest MinPercent that the percentage still meets.
func bandFor(scheme models.GradingScheme, pct float64) models.GradeBand {
	if len(scheme.Bands) == 0 {
		return models.GradeBand{Letter: "N/A"}
	}
	bands := make([]models.GradeBand, len(scheme.Bands))
	copy(bands, scheme.Bands)
	sort.Slice(bands, func(i, j int) bool { return bands[i].MinPercent > bands[j].MinPercent })
	for _, b := range bands {
		if pct >= b.MinPercent {
			return b
		}
	}
	return bands[len(bands)-1]
}

// normKey normalizes a name for fuzzy matching (lowercase, spaces collapsed,
// underscores/hyphens treated as spaces).
func normKey(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, "_", " ")
	s = strings.ReplaceAll(s, "-", " ")
	return strings.Join(strings.Fields(s), " ")
}

func roundTo(v float64, decimals int) float64 {
	if decimals < 0 {
		decimals = 0
	}
	p := math.Pow(10, float64(decimals))
	return math.Round(v*p) / p
}
