"use client";

import DocSection from "../../_shared/DocSection";
import AuthFlow from "../../diagrams/AuthFlow";
import RolePermissionMatrix from "../../diagrams/RolePermissionMatrix";
import CodeBlock from "../../_shared/CodeBlock";
import Callout from "../../_shared/Callout";

const middlewareSnippet = `// backend/middleware/auth.go (shape only)
func Authenticate(c *fiber.Ctx) error {
    raw := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
    claims, err := utils.ParseJWT(raw)
    if err != nil { return utils.Unauthorized(c, "bad token") }

    c.Locals("user_id",   claims.UserID)
    c.Locals("tenant_id", claims.TenantID)
    c.Locals("role",      claims.Role)
    return c.Next()
}

func RequireRole(roles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        if !slices.Contains(roles, c.Locals("role").(string)) {
            return utils.Forbidden(c, "role")
        }
        return c.Next()
    }
}`;

export default function AuthSection() {
  return (
    <DocSection
      id="auth"
      title="Authentication & authorisation"
      description="Email + password only (admin creates everyone else). JWT carries identity; route-level middleware enforces role and tenant."
    >
      <AuthFlow />

      <h3 className="text-base font-bold text-foreground mt-2 mb-2">Middleware</h3>
      <CodeBlock language="go" filename="backend/middleware/auth.go">{middlewareSnippet}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Roles at a glance</h3>
      <RolePermissionMatrix />

      <Callout variant="tip" title="Custom roles">
        Org admins can extend baseline roles via{" "}
        <em>Org → Roles</em>. A user&apos;s effective permissions are{" "}
        <code className="font-mono">base_role ∪ custom_role</code>.
      </Callout>
    </DocSection>
  );
}
