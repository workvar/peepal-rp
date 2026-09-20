package handlers

import (
	"io"
	"net/http/httptest"
	"testing"

	"collegeerp/config"

	"github.com/gofiber/fiber/v2"
)

func TestAllowedOriginHTTPRaspberryPiLocal(t *testing.T) {
	prev := config.App
	t.Cleanup(func() { config.App = prev })
	config.App.RPILocal = true
	config.App.WebAuthnRPID = "raspberrypi.local"

	app := fiber.New()
	var got string
	var err error
	app.Get("/", func(c *fiber.Ctx) error {
		got, err = allowedOrigin(c)
		return nil
	})
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Origin", "http://raspberrypi.local")
	resp, _ := app.Test(req)
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	if err != nil {
		t.Fatalf("allowedOrigin: %v", err)
	}
	if got != "http://raspberrypi.local" {
		t.Errorf("origin = %q", got)
	}
}

func TestAllowedOriginHTTPRaspberryPiLocalRejectedWithoutFlag(t *testing.T) {
	prev := config.App
	t.Cleanup(func() { config.App = prev })
	config.App.RPILocal = false
	config.App.WebAuthnRPID = "raspberrypi.local"

	app := fiber.New()
	var err error
	app.Get("/", func(c *fiber.Ctx) error {
		_, err = allowedOrigin(c)
		return nil
	})
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Origin", "http://raspberrypi.local")
	resp, _ := app.Test(req)
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()
	if err == nil {
		t.Fatal("expected http://raspberrypi.local to be rejected without RPI_LOCAL_ENABLE")
	}
}
