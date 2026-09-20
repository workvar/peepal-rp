package graph

import (
	"encoding/json"
	"strings"

	"collegeerp/graph/model"
	"collegeerp/models"
)

// Course outcomes are stored newline-separated on the subject and exposed as a
// list; the course plan (units) is stored JSON-encoded. These helpers convert
// between the storage form and the GraphQL list/object forms.

func outcomesToList(s string) []string {
	out := []string{}
	for _, p := range strings.Split(s, "\n") {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func outcomesToText(list []string) string {
	cleaned := make([]string, 0, len(list))
	for _, o := range list {
		if t := strings.TrimSpace(o); t != "" {
			cleaned = append(cleaned, t)
		}
	}
	return strings.Join(cleaned, "\n")
}

func unitsFromJSON(s string) []*model.SubjectUnit {
	out := []*model.SubjectUnit{}
	if strings.TrimSpace(s) == "" {
		return out
	}
	var raw []models.SubjectUnit
	if err := json.Unmarshal([]byte(s), &raw); err != nil {
		return out
	}
	for _, u := range raw {
		mu := &model.SubjectUnit{Title: u.Title, Content: u.Content}
		mu.LabActivities = toStrPtr(u.LabActivities)
		mu.FieldVisits = toStrPtr(u.FieldVisits)
		mu.Others = toStrPtr(u.Others)
		out = append(out, mu)
	}
	return out
}

func unitsInputToJSON(units []*model.SubjectUnitInput) string {
	raw := make([]models.SubjectUnit, 0, len(units))
	for _, u := range units {
		if u == nil {
			continue
		}
		title := strings.TrimSpace(u.Title)
		if title == "" && strings.TrimSpace(u.Content) == "" {
			continue // skip wholly empty units
		}
		raw = append(raw, models.SubjectUnit{
			Title:         title,
			Content:       u.Content,
			LabActivities: strVal(u.LabActivities),
			FieldVisits:   strVal(u.FieldVisits),
			Others:        strVal(u.Others),
		})
	}
	if len(raw) == 0 {
		return ""
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return ""
	}
	return string(b)
}
