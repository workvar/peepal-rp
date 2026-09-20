"use client";

import { DocSection, Callout, AuthFlow, RolePermissionMatrix, StepList, CodeBlock } from "../ui";

/** Chapter 4 — authentication and authorization. */
export default function AuthZ() {
  return (
    <DocSection
      eyebrow="Chapter 4"
      title="Authentication & Authorization"
      description="Login is email/identifier + password only — there is no public sign-up; admins create users. Sessions ride in a signed, httpOnly cookie, and every call is gated by role (and, on top of that, the access matrix in the next chapter)."
    >
      <AuthFlow />

      <h3 className="text-base font-bold text-foreground">Logging in</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        Login is one of the few REST endpoints (it sets a cookie, so it never went to GraphQL):{" "}
        <code className="font-mono text-xs">POST /api/v1/auth/login</code>, handled by{" "}
        <code className="font-mono text-xs">handlers.Login</code> and rate-limited to ~10 attempts
        per IP per minute.
      </p>
      <StepList
        steps={[
          { title: "Identify the user", body: <>The body sends an <code className="font-mono text-xs">identifier</code> (email, employee ID, or student roll number) plus <code className="font-mono text-xs">password</code> and, for tenant users, the <code className="font-mono text-xs">tenant_subdomain</code>. resolveUserByIdentifier looks the user up tenant-scoped and active. With no subdomain, only a super_admin on the platform tenant may sign in (the /super/login path).</> },
          { title: "Verify the password", body: <>The stored bcrypt hash is checked with <code className="font-mono text-xs">utils.CheckPassword</code>. On a miss, a dummy bcrypt compare is run so response timing doesn't leak whether the account exists.</> },
          { title: "Check the subscription", body: <>For non-super-admins, <code className="font-mono text-xs">SubscriptionLoginAllowed</code> must pass — see the callout below.</> },
          { title: "Issue the session", body: <>Two httpOnly cookies are written: a short-lived signed JWT as <code className="font-mono text-xs">peepal_token</code>, and a long-lived rotating refresh token as <code className="font-mono text-xs">peepal_refresh</code>. The response returns the user object (and the access token in the body for non-browser clients).</> },
        ]}
      />

      <h3 className="text-base font-bold text-foreground mt-2">The token &amp; cookie</h3>
      <CodeBlock language="go" filename="utils/jwt.go — claims (HS256, ACCESS_TOKEN_TTL)">{`type JWTClaims struct {
    UserID       string
    Email        string
    Role         string // ACTIVE workspace
    BaseRole     string // primary role; IsSuperAdmin derives from it
    TenantID     string
    IsSuperAdmin bool   // true when BaseRole == "super_admin"
    SessionID    string // "sid" — links to the refresh-token family
    jwt.RegisteredClaims  // ExpiresAt = now + ACCESS_TOKEN_TTL (15m default)
}`}</CodeBlock>
      <CodeBlock language="go" filename="how the cookies are set (handlers/session.go)">{`// 1. The access token: short-lived, presented on every request.
c.Cookie(&fiber.Cookie{
    Name:     "peepal_token", // middleware.AuthCookieName
    Value:    token,
    HTTPOnly: true,             // JavaScript can never read it
    Secure:   config.App.CookieSecure,
    SameSite: "Lax",
    Path:     "/",
    MaxAge:   accessCookieMaxAge(), // TTL + 1h, so an expired-but-present
})                                  // cookie still signals "try refreshing"

// 2. The refresh token: long-lived, spent only at POST /auth/refresh.
c.Cookie(&fiber.Cookie{
    Name:     "peepal_refresh", // middleware.RefreshCookieName
    Value:    refreshPlain,     // 256 bits of CSPRNG; only its SHA-256 is stored
    HTTPOnly: true,
    Secure:   config.App.CookieSecure,
    SameSite: "Lax",
    Path:     "/",
    MaxAge:   int(time.Until(refresh.ExpiresAt).Seconds()), // 30d default
})
// Logout revokes the session server-side, then clears both cookies.`}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-2">Refreshing a session</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        A JWT cannot be revoked once minted, so its lifetime is the entire blast radius of a leak —
        hence the short TTL. Sessions stay long-lived anyway because{" "}
        <code className="font-mono text-xs">POST /api/v1/auth/refresh</code> exchanges the refresh
        cookie for a new access token. The frontend does this automatically on any 401 (see{" "}
        <code className="font-mono text-xs">lib/refreshSession.ts</code>), so users never see it.
      </p>
      <StepList
        steps={[
          { title: "Rotation", body: <>Every redemption spends the presented token and issues a new one in the same session family (<code className="font-mono text-xs">models.RefreshToken.SessionID</code>). A stolen token is therefore usable at most once.</> },
          { title: "Reuse detection", body: <>A token replayed after it was already spent means two parties hold it. Since we cannot tell which is the thief, the whole family is revoked and both must sign in again. Replays inside <code className="font-mono text-xs">REFRESH_REUSE_GRACE</code> (30s) are forgiven — that is parallel tabs racing, not theft.</> },
          { title: "Re-checked gates", body: <>Every refresh re-verifies the account is active, the subscription is live, and the active workspace is still granted. Revoking access therefore takes effect within one access-token lifetime rather than waiting out a long-lived JWT.</> },
          { title: "Absolute expiry", body: <>Rotation copies the original deadline forward, so an active session cannot extend itself past <code className="font-mono text-xs">REFRESH_TOKEN_TTL</code>.</> },
        ]}
      />
      <Callout variant="warn" title="Only hashes are stored">
        The refresh token exists in plaintext in exactly two places: the response that minted it and
        the browser&apos;s cookie. The database holds only{" "}
        <code className="font-mono text-xs">sha256(token)</code>, so a dump of{" "}
        <code className="font-mono text-xs">refresh_tokens</code> yields no usable sessions.
      </Callout>

      <Callout variant="warn" title="No tokens in localStorage">
        The JWT lives only in the httpOnly cookie. The frontend's{" "}
        <code className="font-mono text-xs">hasSession</code> flag is backed by a non-secret{" "}
        <code className="font-mono text-xs">peepal_session</code> marker in localStorage — a hint
        that a cookie probably exists, never the token itself. Do not reintroduce token storage in
        JS.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">How the frontend holds a session</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        Redux <code className="font-mono text-xs">authSlice</code> tracks{" "}
        <code className="font-mono text-xs">{`{ user, hasSession, tenantSlug }`}</code>. On load the
        dashboard dispatches <code className="font-mono text-xs">fetchMe</code> (
        <code className="font-mono text-xs">GET /auth/me</code>) to rehydrate the user, then{" "}
        <code className="font-mono text-xs">fetchMyAccess</code>. The axios client sends{" "}
        <code className="font-mono text-xs">withCredentials: true</code> (so the cookie rides along)
        and an <code className="font-mono text-xs">X-Tenant-ID</code> header; a 401 clears the
        session and redirects to login.
      </p>

      <h3 className="text-base font-bold text-foreground mt-2">Authenticating GraphQL calls</h3>
      <StepList
        steps={[
          { title: "Authenticate (HTTP)", body: <><code className="font-mono text-xs">middleware.Authenticate</code> guards <code className="font-mono text-xs">/api/v1/graphql</code>. It reads the token from the Authorization: Bearer header or the peepal_token cookie, verifies the JWT, and stores user/role/tenant in Fiber locals.</> },
          { title: "Inject context (GraphQL)", body: <>An AroundOperations hook (<code className="font-mono text-xs">injectAuthContext</code>) copies those locals into a typed AuthContext on the request context.</> },
          { title: "Read it in resolvers", body: <>Resolvers call <code className="font-mono text-xs">AuthFromCtx(ctx)</code>, then <code className="font-mono text-xs">requireAuth</code> / <code className="font-mono text-xs">requireRole</code>. Failures surface as GraphQL errors with codes UNAUTHORIZED / FORBIDDEN.</> },
        ]}
      />
      <Callout variant="info" title="Super-admin is a skeleton key">
        <code className="font-mono text-xs">requireRole</code> always lets a super_admin through, and
        asking for <code className="font-mono text-xs">"admin"</code> also admits super_admin. These
        guards are the per-resolver floor; the access matrix (next chapter) can tighten below them
        but never grant past them.
      </Callout>

      <h3 className="text-base font-bold text-foreground mt-2">Roles &amp; custom roles</h3>
      <p className="text-sm text-foreground/85 leading-relaxed">
        Base roles live on <code className="font-mono text-xs">User.Role</code>:{" "}
        <code className="font-mono text-xs">super_admin</code>,{" "}
        <code className="font-mono text-xs">admin</code>,{" "}
        <code className="font-mono text-xs">teacher</code>,{" "}
        <code className="font-mono text-xs">student</code>,{" "}
        <code className="font-mono text-xs">staff</code>. A tenant can also define{" "}
        <code className="font-mono text-xs">CustomRole</code>s and link one to a user via{" "}
        <code className="font-mono text-xs">assignUserCustomRole</code>; a custom role's grants are
        OR-ed with the base role in the access matrix.
      </p>
      <RolePermissionMatrix />

      <Callout variant="warn" title="Login is blocked without an active subscription">
        For non-super-admins, <code className="font-mono text-xs">SubscriptionLoginAllowed</code>
        permits login only when the tenant has a <code className="font-mono text-xs">TenantSubscription</code>
        whose status is <code className="font-mono text-xs">active</code> or{" "}
        <code className="font-mono text-xs">trial</code>;{" "}
        <code className="font-mono text-xs">none</code> / <code className="font-mono text-xs">suspended</code> /{" "}
        <code className="font-mono text-xs">expired</code> all block. A suspended tenant is rejected
        too. Super admins are exempt. The mechanics are in the next chapter.
      </Callout>
    </DocSection>
  );
}
