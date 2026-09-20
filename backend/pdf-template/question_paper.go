package pdftemplate

// Question paper PDF: institute header, exam metadata, instructions, then the
// questions grouped into their printed sections. A draft prints under a DRAFT
// watermark so an unfinalized paper can never be mistaken for the real one.

import (
	"fmt"
	"strings"

	"collegeerp/graph/model"
)

// sectionTitles label the printed groups the generator assigns.
var sectionTitles = map[string]string{
	"A": "Section A - Objective",
	"B": "Section B - Short Answer",
	"C": "Section C - Long Answer",
}

// BuildQuestionPaperPDF renders one question paper. institute is printed as
// the letterhead; a blank one just drops that line.
func BuildQuestionPaperPDF(institute string, p *model.QuestionPaper) ([]byte, error) {
	d := NewDoc()

	if !strings.EqualFold(p.Status, "finalized") {
		d.Watermark("DRAFT")
	}

	if institute != "" {
		d.H1(institute)
		d.H2(p.Title)
	} else {
		d.H1(p.Title)
	}

	if p.Subject != nil {
		d.Body("Subject: " + p.Subject.Name + " (" + p.Subject.Code + ")")
	}
	if p.ExamType != nil {
		d.Body("Exam: " + p.ExamType.Name)
	}

	meta := []string{fmt.Sprintf("Max Marks: %s", num(p.TotalMarks))}
	if p.DurationMinutes != nil && *p.DurationMinutes > 0 {
		meta = append(meta, fmt.Sprintf("Duration: %d minutes", *p.DurationMinutes))
	}
	d.Body(strings.Join(meta, "     |     "))
	d.Divider()

	if p.Instructions != nil && strings.TrimSpace(*p.Instructions) != "" {
		d.H3("Instructions")
		for _, line := range strings.Split(*p.Instructions, "\n") {
			if s := strings.TrimSpace(line); s != "" {
				d.Muted(s)
			}
		}
		d.Space(4)
	}

	writeSections(d, p.Items)

	d.Space(6)
	d.Italic("--- End of Paper ---")
	return d.Bytes()
}

// writeSections walks items in order, opening a heading each time the section
// changes. The generator already sorted them, so one pass is enough.
func writeSections(d *Doc, items []*model.QuestionPaperItem) {
	if len(items) == 0 {
		d.Muted("No questions on this paper.")
		return
	}

	current := ""
	for _, item := range items {
		if item == nil {
			continue
		}
		section := ""
		if item.Section != nil {
			section = *item.Section
		}
		if section != current {
			current = section
			d.Space(3)
			d.H2(sectionTitle(section))
		}
		writeQuestion(d, item)
	}
}

// writeQuestion prints one numbered question with its marks and, for MCQs, its
// lettered options.
func writeQuestion(d *Doc, item *model.QuestionPaperItem) {
	d.Space(2)
	d.Body(fmt.Sprintf("Q%d. %s   [%s]", item.SeqNo, item.QuestionText, num(item.Marks)))
	for i, opt := range item.Options {
		// a) b) c) … — 26 options is far past any real paper, but wrap anyway
		// rather than emit a garbage rune.
		d.Muted(fmt.Sprintf("     %c) %s", 'a'+rune(i%26), opt))
	}
}

// sectionTitle maps a section key to its printed heading, falling back to a
// generic label for any key the generator might add later.
func sectionTitle(section string) string {
	if title, ok := sectionTitles[section]; ok {
		return title
	}
	if section == "" {
		return "Questions"
	}
	return "Section " + section
}
