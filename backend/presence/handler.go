package presence

import (
	"net/http"
	"strings"
	"time"

	"collegeerp/middleware"
	"collegeerp/utils"

	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Same-origin browser clients and authenticated API clients; auth is
		// enforced before upgrade.
		return true
	},
}

// NewHandler returns a Fiber handler for GET /api/v1/presence that upgrades
// to a WebSocket. Authentication follows middleware.Authenticate: Bearer
// Authorization header or the peepal_token cookie.
func NewHandler(hub *Hub) fiber.Handler {
	return adaptor.HTTPHandler(httpHandler(hub))
}

func httpHandler(hub *Hub) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := authenticateRequest(r)
		if err != nil || claims == nil || claims.UserID == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}
		tenantID := claims.TenantID
		if tenantID == "" {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		hub.Connect(tenantID, claims.UserID)
		defer hub.Disconnect(tenantID, claims.UserID)

		_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		conn.SetPongHandler(func(string) error {
			_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			return nil
		})

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}
			// Optional client ping text; ignore other payloads.
			if string(msg) == "ping" {
				_ = conn.WriteMessage(websocket.TextMessage, []byte("pong"))
				_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
			}
		}
	})
}

func authenticateRequest(r *http.Request) (*utils.JWTClaims, error) {
	token := extractHTTPToken(r)
	if token == "" {
		return nil, http.ErrNoCookie
	}
	return utils.ParseToken(token)
}

func extractHTTPToken(r *http.Request) string {
	if authHeader := r.Header.Get("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && parts[0] == "Bearer" {
			return parts[1]
		}
		return ""
	}
	c, err := r.Cookie(middleware.AuthCookieName)
	if err != nil || c == nil {
		return ""
	}
	return c.Value
}
