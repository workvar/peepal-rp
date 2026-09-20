package bulk

// Bulk import for the exam-cell question bank. Question banks are the one
// exam-cell resource with genuinely high row counts — a department seeding a
// semester's pool uploads hundreds of rows — so this uses the REST bulk
// framework rather than a per-row GraphQL loop.

import (
	"encoding/json"
	"errors"
	"strings"

	"collegeerp/database"
	"collegeerp/models"

	"github.com/google/uuid"
)

var questionBankSchema = &Schema{
	Resource:    "question_bank",
	Title:       "Question Bank",
	Description: "Import exam questions in bulk. Each row is scoped to a curriculum subject, identified by course code, semester and subject code — the subject must already be assigned to that semester on the Curriculum page. MCQ options go in one cell separated by a pipe (|).",
	RequireRole: []string{"admin", "teacher"},
	Fields: []Field{
		{
			Name: "course", Label: "Course", Type: FieldString, Required: true,
			Description: "Course code or name the question belongs to.",
			Example:     "BTCS",
		},
		{
			Name: "semester", Label: "Semester", Type: FieldInt, Required: true,
			Description: "Semester number the subject is taught in.",
			Example:     "3",
		},
		{
			Name: "subject", Label: "Subject", Type: FieldString, Required: true,
			Description: "Subject code (or UUID). Must be assigned to this course-semester in the curriculum.",
			Example:     "CS301",
		},
		{
			Name: "unit", Label: "Unit", Type: FieldString,
			Description: "Syllabus unit or topic label. The paper generator spreads questions across units, so filling this in gives better papers.",
			Example:     "Unit 2 - Linked Lists",
		},
		{
			Name: "question_text", Label: "Question", Type: FieldString, Required: true,
			Description: "The question exactly as it should be printed.",
			Example:     "Explain the difference between a singly and doubly linked list.",
		},
		{
			Name: "question_type", Label: "Type", Type: FieldEnum,
			AllowedValues: models.QuestionTypes,
			Description:   "Question shape. Defaults to long.",
			Example:       "long",
		},
		{
			Name: "difficulty", Label: "Difficulty", Type: FieldEnum,
			AllowedValues: models.QuestionDifficulties,
			Description:   "Difficulty bucket the generator fills from. Defaults to medium.",
			Example:       "medium",
		},
		{
			Name: "marks", Label: "Marks", Type: FieldFloat,
			Description: "Marks the question carries. Defaults to 1.",
			Example:     "5",
		},
		{
			Name: "options", Label: "Options", Type: FieldString,
			Description: "MCQ choices separated by a pipe (|). Leave blank for non-MCQ questions.",
			Example:     "Stack|Queue|Tree|Graph",
		},
		{
			Name: "answer", Label: "Answer", Type: FieldString,
			Description: "Model answer or the correct option. Never printed on a paper.",
			Example:     "Queue",
		},
		{
			Name: "course_outcome", Label: "Course Outcome", Type: FieldString,
			Description: "Course-outcome tag for outcome mapping (CO1, CO2, …).",
			Example:     "CO2",
		},
	},
	Create: createQuestionBankRow,
}

func createQuestionBankRow(ctx Ctx, row map[string]string) (string, error) {
	text := strings.TrimSpace(row["question_text"])
	if text == "" {
		return "", errors.New("question text is required")
	}

	// Resolving through the curriculum both validates the reference and gives
	// us the subject id to denormalize onto the question.
	curriculumSubjectID, err := resolveCurriculumSubjectID(
		ctx.TenantID, row["course"], row["semester"], row["subject"],
	)
	if err != nil {
		return "", err
	}
	subjectID, err := resolveSubjectID(ctx.TenantID, row["subject"])
	if err != nil {
		return "", err
	}

	q := models.QuestionBankItem{
		ID:                  uuid.NewString(),
		TenantID:            ctx.TenantID,
		CurriculumSubjectID: curriculumSubjectID,
		SubjectID:           subjectID,
		Unit:                strings.TrimSpace(row["unit"]),
		QuestionText:        text,
		QuestionType:        normalizeBulkQuestionType(row["question_type"]),
		Difficulty:          normalizeBulkDifficulty(row["difficulty"]),
		Marks:               ParseFloat(row["marks"]),
		Options:             pipeOptionsToJSON(row["options"]),
		Answer:              strings.TrimSpace(row["answer"]),
		CourseOutcome:       strings.TrimSpace(row["course_outcome"]),
		Active:              true,
		CreatedByID:         ctx.ActorID,
	}
	if q.Marks <= 0 {
		q.Marks = 1
	}
	if err := database.DB.Create(&q).Error; err != nil {
		return "", errors.New("could not save the question")
	}
	return q.ID, nil
}

// pipeOptionsToJSON turns "A|B|C" into the JSON array the model stores. CSV
// cells cannot hold nested structure, so the pipe is the escape hatch.
func pipeOptionsToJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, "|")
	clean := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			clean = append(clean, s)
		}
	}
	if len(clean) == 0 {
		return ""
	}
	// Same JSON-array shape the resolvers write, so a bulk-imported question
	// and a hand-entered one are indistinguishable downstream.
	b, err := json.Marshal(clean)
	if err != nil {
		return ""
	}
	return string(b)
}

// normalizeBulkDifficulty / normalizeBulkQuestionType mirror the resolver's
// coercion. Duplicated rather than imported because handlers must not depend
// on the graph package (graph already imports handlers' siblings).
func normalizeBulkDifficulty(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case models.QDifficultyEasy:
		return models.QDifficultyEasy
	case models.QDifficultyHard:
		return models.QDifficultyHard
	default:
		return models.QDifficultyMedium
	}
}

func normalizeBulkQuestionType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case models.QTypeMCQ:
		return models.QTypeMCQ
	case models.QTypeShort:
		return models.QTypeShort
	case models.QTypeNumeric:
		return models.QTypeNumeric
	default:
		return models.QTypeLong
	}
}

func init() { Register(questionBankSchema) }
