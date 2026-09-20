"use client";

import DocSection from "../../_shared/DocSection";
import CodeBlock from "../../_shared/CodeBlock";
import StepList from "../../_shared/StepList";
import Callout from "../../_shared/Callout";

export default function DevWorkflowSection() {
  return (
    <DocSection
      id="dev-workflow"
      title="Local development"
      description="One terminal for the API, one for the web app. AutoMigrate handles schema changes; no manual migrations to run."
    >
      <CodeBlock language="bash" filename="terminal A — backend">{`cd backend
go mod tidy
go run main.go            # http://localhost:8080
# default super admin seeded from env: admin@college.edu / Admin@123`}</CodeBlock>

      <CodeBlock language="bash" filename="terminal B — frontend">{`cd frontend
pnpm install
pnpm dev                  # http://localhost:3000
# point NEXT_PUBLIC_API_URL at the Go server`}</CodeBlock>

      <h3 className="text-base font-bold text-foreground mt-6 mb-2">Adding a feature end-to-end</h3>
      <StepList
        steps={[
          { title: "Model", body: "Create the GORM model under backend/models. Include tenant_id and BeforeCreate UUID hook." },
          { title: "Handler", body: "Add a file in backend/handlers. Always scope queries by tenant_id and return utils.Success / utils.BadRequest." },
          { title: "Route", body: "Register it in backend/routes/routes.go inside the right group (org, hr, finance…)." },
          { title: "Restart Go", body: "AutoMigrate runs on boot — your new table appears automatically." },
          { title: "Frontend page", body: "Create app/[tenant]/(dashboard)/<name>/page.tsx that re-exports from components/pages/.../Page.tsx." },
          { title: "Module entry", body: "Add to constants/navigation/modules.ts so the tile shows up." },
        ]}
      />

      <Callout variant="warn" title="Don’t edit page.tsx logic directly">
        App-router page files are intentionally one-line. All real logic must
        go under <code className="font-mono">components/pages/...</code> so it
        stays splittable and testable.
      </Callout>
    </DocSection>
  );
}
