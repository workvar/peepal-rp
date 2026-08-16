package cmdline

import "testing"

func TestSplit(t *testing.T) {
	cases := []struct {
		in   string
		want []string
	}{
		{`node server.js`, []string{"node", "server.js"}},
		{`"/opt/my app/bin/api" --port 3001`, []string{"/opt/my app/bin/api", "--port", "3001"}},
		{`go build -o 'peepal backend' .`, []string{"go", "build", "-o", "peepal backend", "."}},
		{`  npm   run   start  `, []string{"npm", "run", "start"}},
	}
	for _, c := range cases {
		got, err := Split(c.in)
		if err != nil {
			t.Fatalf("Split(%q): %v", c.in, err)
		}
		if len(got) != len(c.want) {
			t.Fatalf("Split(%q) = %v, want %v", c.in, got, c.want)
		}
		for i := range got {
			if got[i] != c.want[i] {
				t.Errorf("Split(%q)[%d] = %q, want %q", c.in, i, got[i], c.want[i])
			}
		}
	}
}

func TestSplitRejectsUnbalancedQuote(t *testing.T) {
	if _, err := Split(`node "server.js`); err == nil {
		t.Fatal("an unbalanced quote must be an error")
	}
}

func TestSplitRejectsEmpty(t *testing.T) {
	if _, err := Split("   "); err == nil {
		t.Fatal("an empty command must be an error")
	}
}
