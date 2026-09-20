package peepalai

import (
	"database/sql"
	"fmt"

	"gorm.io/gorm"
)

const maxRows = 200

// runReadOnly executes the wrapped query inside a READ ONLY transaction with
// a statement timeout, and returns the result as strings. The transaction is
// always rolled back, so even a query that somehow slipped past the guard
// cannot persist anything.
func runReadOnly(db *gorm.DB, query string, args []interface{}) (columns []string, rows [][]string, err error) {
	tx := db.Begin()
	if tx.Error != nil {
		return nil, nil, tx.Error
	}
	defer tx.Rollback()

	if err := tx.Exec("SET TRANSACTION READ ONLY").Error; err != nil {
		return nil, nil, err
	}
	if err := tx.Exec("SET LOCAL statement_timeout = '8s'").Error; err != nil {
		return nil, nil, err
	}

	sqlRows, err := tx.Raw(query, args...).Rows()
	if err != nil {
		return nil, nil, fmt.Errorf("the generated query failed to run")
	}
	defer sqlRows.Close()

	columns, err = sqlRows.Columns()
	if err != nil {
		return nil, nil, err
	}

	for sqlRows.Next() && len(rows) < maxRows {
		raw := make([]sql.NullString, len(columns))
		ptrs := make([]interface{}, len(columns))
		for i := range raw {
			ptrs[i] = &raw[i]
		}
		if err := sqlRows.Scan(ptrs...); err != nil {
			return nil, nil, err
		}
		row := make([]string, len(columns))
		for i, v := range raw {
			if v.Valid {
				row[i] = v.String
			}
		}
		rows = append(rows, row)
	}
	return columns, rows, nil
}
