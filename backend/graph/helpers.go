package graph

func toIntPtr(n int) *int {
	if n == 0 {
		return nil
	}
	v := n
	return &v
}

func intVal(n *int) int {
	if n == nil {
		return 0
	}
	return *n
}

func derefBool(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func floatVal(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}
