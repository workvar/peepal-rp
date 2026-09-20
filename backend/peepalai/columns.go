package peepalai

import (
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// Column introspection. Columns are read from information_schema so the
// catalog never drifts from the live database: catalog entries whose table
// does not exist are silently dropped, and only real columns are exposed to
// the model and included in the scoped CTEs.

var globalDeniedColumns = map[string]bool{
	"password": true, "password_hash": true, "token": true, "secret": true, "otp": true,
}

var (
	colMu     sync.Mutex
	colCache  map[string][]string
	colLoaded time.Time
)

// tableColumns returns table → exposed columns for every catalog table that
// exists in the database. Cached for 5 minutes.
func tableColumns(db *gorm.DB) (map[string][]string, error) {
	colMu.Lock()
	defer colMu.Unlock()
	if colCache != nil && time.Since(colLoaded) < 5*time.Minute {
		return colCache, nil
	}

	names := make([]string, 0, len(Catalog))
	for _, t := range Catalog {
		names = append(names, t.Name)
	}

	type row struct {
		TableName  string
		ColumnName string
	}
	var rows []row
	err := db.Raw(`SELECT table_name, column_name
		FROM information_schema.columns
		WHERE table_schema = 'public' AND table_name IN ?
		ORDER BY table_name, ordinal_position`, names).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	out := map[string][]string{}
	for _, r := range rows {
		col := strings.ToLower(r.ColumnName)
		if globalDeniedColumns[col] || deniedForTable(r.TableName, col) {
			continue
		}
		out[r.TableName] = append(out[r.TableName], col)
	}
	colCache, colLoaded = out, time.Now()
	return out, nil
}

func deniedForTable(table, col string) bool {
	for _, c := range sensitiveColumns[table] {
		if c == col {
			return true
		}
	}
	return false
}

// allTableNames returns every table name in the public schema. Used by the
// guard to detect references to tables outside the caller's grants.
func allTableNames(db *gorm.DB) ([]string, error) {
	var names []string
	err := db.Raw(`SELECT table_name FROM information_schema.tables
		WHERE table_schema = 'public'`).Scan(&names).Error
	return names, err
}
