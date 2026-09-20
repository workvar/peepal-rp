"use client";

import DiagramFrame from "./DiagramFrame";

/** Sequence of how a user logs in and how subsequent requests are authorised. */
export default function AuthFlow() {
  return (
    <DiagramFrame
      title="Authentication & Authorisation"
      caption="Login verifies the password and sets two httpOnly cookies: a short-lived signed JWT (HS256, 15m) named peepal_token, and a rotating refresh token named peepal_refresh. Both are sent automatically on later requests; the access token is verified by middleware, and when it expires the client exchanges the refresh cookie at POST /api/v1/auth/refresh. Neither is ever exposed to JavaScript."
    >
      <svg viewBox="0 0 880 380" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        <defs>
          <marker id="af-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Lanes */}
        {[
          { x: 60,  label: "User" },
          { x: 280, label: "Login Page" },
          { x: 500, label: "Fiber API" },
          { x: 720, label: "DB" },
        ].map((l, i) => (
          <g key={i}>
            <rect x={l.x} y="20" width="120" height="34" rx="8" className="fill-card" stroke="currentColor" strokeOpacity="0.3" />
            <text x={l.x + 60} y="42" textAnchor="middle" className="fill-foreground" fontSize="12" fontWeight="700">{l.label}</text>
            <line x1={l.x + 60} y1="58" x2={l.x + 60} y2="360" stroke="currentColor" strokeOpacity="0.18" strokeDasharray="3 4" />
          </g>
        ))}

        <g fill="none" stroke="currentColor" strokeWidth="1.4" className="text-foreground">
          {/* User -> Login */}
          <path d="M120,90 L340,90" markerEnd="url(#af-arr)" />
          {/* Login -> API */}
          <path d="M340,130 L560,130" markerEnd="url(#af-arr)" />
          {/* API -> DB */}
          <path d="M560,170 L780,170" markerEnd="url(#af-arr)" />
          {/* DB -> API */}
          <path d="M780,210 L560,210" markerEnd="url(#af-arr)" />
          {/* API -> Login */}
          <path d="M560,250 L340,250" markerEnd="url(#af-arr)" />
          {/* Login -> User */}
          <path d="M340,290 L120,290" markerEnd="url(#af-arr)" />
          {/* Subsequent calls */}
          <path d="M120,340 L780,340" markerEnd="url(#af-arr)" strokeDasharray="4 4" />
        </g>

        <g className="fill-foreground" fontSize="11">
          <text x="230" y="84" textAnchor="middle">enters identifier + password</text>
          <text x="450" y="124" textAnchor="middle">POST /api/v1/auth/login</text>
          <text x="670" y="164" textAnchor="middle">SELECT user, verify bcrypt</text>
          <text x="670" y="204" textAnchor="middle">user row</text>
          <text x="450" y="244" textAnchor="middle">{"{ token, user, tenant }"}</text>
          <text x="230" y="284" textAnchor="middle">Set-Cookie: peepal_token + peepal_refresh</text>
          <text x="450" y="334" textAnchor="middle" fontWeight="700">peepal_token cookie (or Bearer)  →  middleware.Authenticate</text>
        </g>
      </svg>
    </DiagramFrame>
  );
}
