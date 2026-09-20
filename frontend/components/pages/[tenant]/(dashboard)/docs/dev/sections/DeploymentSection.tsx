"use client";

import DocSection from "../../_shared/DocSection";
import CodeBlock from "../../_shared/CodeBlock";
import Callout from "../../_shared/Callout";

export default function DeploymentSection() {
  return (
    <DocSection
      id="deployment"
      title="Deployment"
      description="PM2 runs both processes; the Go binary is statically compiled and the Next.js app is built once per release."
    >
      <CodeBlock language="bash" filename="build & start (single host)">{`# Backend
cd backend
go build -o collegeerp .
pm2 start ecosystem.config.js  # uses the API entry

# Frontend
cd ../frontend
pnpm build
pm2 start ecosystem.config.js  # uses the web entry

pm2 save
pm2 startup`}</CodeBlock>

      <Callout variant="info" title="Database">
        The database is PostgreSQL (Aiven-managed), via the GORM postgres
        driver (pgx). The connection string comes from the{" "}
        <code className="font-mono">DB_PATH</code> env var; schema changes are
        applied by running the backend with the{" "}
        <code className="font-mono">--migrate</code> flag (AutoMigrate is gated
        behind it, so a normal boot never touches the schema).
      </Callout>

      <Callout variant="warn" title="Static uploads">
        Photo uploads & generated payslip PDFs land under{" "}
        <code className="font-mono">backend/uploads/</code>. Mount this on a
        persistent volume — it&apos;s outside the binary.
      </Callout>
    </DocSection>
  );
}
