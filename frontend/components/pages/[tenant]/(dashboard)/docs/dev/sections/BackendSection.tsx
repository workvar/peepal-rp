"use client";

import DocSection from "../../_shared/DocSection";
import CodeBlock from "../../_shared/CodeBlock";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

const handlerSnippet = `// backend/handlers/students.go (shape only)
func ListStudents(c *fiber.Ctx) error {
    tenantID := c.Locals("tenant_id").(string)

    var students []models.Student
    if err := database.DB.
        Where("tenant_id = ?", tenantID).
        Preload("User").
        Preload("Course").
        Find(&students).Error; err != nil {
        return utils.InternalError(c, err.Error())
    }
    return utils.Success(c, students, "ok")
}`;

const routeSnippet = `// backend/routes/routes.go (excerpt)
api := app.Group("/api/v1")
api.Post("/auth/login", handlers.Login)

protected := api.Use(middleware.Authenticate, middleware.Tenant)
protected.Get ("/students",     handlers.ListStudents)
protected.Post("/students",     middleware.RequireRole("admin"), handlers.CreateStudent)
protected.Put ("/students/:id", middleware.RequireRole("admin"), handlers.UpdateStudent)`;

export default function BackendSection() {
  return (
    <DocSection
      id="backend"
      title="Backend (Go · Fiber · GORM)"
      description="A flat handler-per-module layout. The router lives in routes/routes.go and is the single source of truth for the public API surface."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { k: "config/",     v: "Loads .env, exposes config.App.{Port,JWTSecret,...}" },
          { k: "database/",   v: "GORM Connect() + Migrate() called from main.go on every boot" },
          { k: "models/",     v: "One file per domain: user, student, employee, mark, leave …" },
          { k: "handlers/",   v: "HTTP entry points; mirror the model files 1:1" },
          { k: "middleware/", v: "auth.go (JWT) and tenant.go (scope injection)" },
          { k: "routes/",     v: "Single Register(app) function — read it for the full API map" },
          { k: "graph/",      v: "gqlgen GraphQL schema + resolvers; reuses handlers/services" },
          { k: "utils/",      v: "APIResponse helpers (Success, BadRequest, InternalError)" },
          { k: "uploads/",    v: "Photo uploads + payslip PDFs (mounted as static)" },
        ].map((r) => (
          <div key={r.k} className="rounded-lg border border-border bg-card p-3">
            <div className="text-xs font-mono text-primary mb-1">{r.k}</div>
            <div className="text-xs text-muted-foreground">{r.v}</div>
          </div>
        ))}
      </div>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Route registration</h3>
      <CodeBlock language="go" filename="backend/routes/routes.go">{routeSnippet}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">A typical handler</h3>
      <CodeBlock language="go" filename="backend/handlers/students.go">{handlerSnippet}</CodeBlock>

      <Callout variant="warn" title="Always scope by tenant_id">
        Every list / read / write must include{" "}
        <InlineKey>WHERE tenant_id = ?</InlineKey>. The tenant middleware sets{" "}
        <InlineKey>c.Locals(&quot;tenant_id&quot;)</InlineKey> from the JWT — never trust a
        body field for tenant.
      </Callout>
    </DocSection>
  );
}
