package bulk

import "testing"

// The three fee resources must register (via init) under their expected slugs
// and expose a Create function, or the generic /bulk/:resource routes 404.
func TestFeeResourcesRegistered(t *testing.T) {
	for _, res := range []string{"fee_categories", "fee_structures", "fee_addons", "fee_allocations", "fee_payments"} {
		s, ok := Get(res)
		if !ok {
			t.Fatalf("resource %q is not registered", res)
		}
		if s.Create == nil {
			t.Fatalf("resource %q has no Create function", res)
		}
		if len(s.Fields) == 0 {
			t.Fatalf("resource %q has no fields", res)
		}
	}
}

func TestSplitListHandlesSemicolonsAndNewlines(t *testing.T) {
	got := splitList("A:1\n B:2 ; ; C:3")
	want := []string{"A:1", "B:2", "C:3"}
	if len(got) != len(want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("entry %d: expected %q, got %q", i, want[i], got[i])
		}
	}
}

func TestFeeRound2(t *testing.T) {
	if got := feeRound2(10.005); got != 10.01 {
		t.Fatalf("expected 10.01, got %v", got)
	}
	if got := feeRound2(33333.333333); got != 33333.33 {
		t.Fatalf("expected 33333.33, got %v", got)
	}
}
