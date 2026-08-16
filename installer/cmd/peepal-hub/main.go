// Command peepal-hub is the developer's side of the monitoring story: it
// receives heartbeats, logs and crashes from every installation, and hands
// back the commands the developer queued for them.
//
// It is deliberately small and dependency-free. Point it at a directory, put
// it behind a TLS terminator, and give each customer a token.
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	var (
		addr  = flag.String("addr", ":9000", "address to listen on")
		dir   = flag.String("data", "./hub-data", "where events are stored")
		token = flag.String("token", os.Getenv("HUB_TOKEN"), "shared token installations authenticate with")
		admin = flag.String("admin-token", os.Getenv("HUB_ADMIN_TOKEN"), "token for the developer console")
	)
	flag.Parse()

	if *token == "" {
		log.Fatal("set -token (or HUB_TOKEN): installations must authenticate")
	}
	if *admin == "" {
		log.Fatal("set -admin-token (or HUB_ADMIN_TOKEN): the console must be protected")
	}

	store, err := NewStore(*dir)
	if err != nil {
		log.Fatal(err)
	}
	srv := &Server{Store: store, Token: *token, AdminToken: *admin}

	mux := http.NewServeMux()
	srv.Routes(mux)

	fmt.Printf("hub listening on %s, data in %s\n", *addr, *dir)
	httpSrv := &http.Server{
		Addr:              *addr,
		Handler:           logRequests(mux),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      30 * time.Second,
	}
	log.Fatal(httpSrv.ListenAndServe())
}

// logRequests keeps one line per request, which is all the operator of a hub
// with a few dozen installs actually reads.
func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
		}
	})
}
