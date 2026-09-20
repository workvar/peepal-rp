"use client";

import DocSection from "../../_shared/DocSection";
import ModuleMap from "../../diagrams/ModuleMap";
import Callout from "../../_shared/Callout";

export default function ModulesSection() {
  return (
    <DocSection
      id="modules"
      title="Modules"
      description="Every tile on the dashboard is a self-contained module. They share the same anatomy: a model, a handler file, a route group, and a page directory."
    >
      <ModuleMap />

      <Callout variant="tip" title="Adding a module">
        Create the model in <code className="font-mono">backend/models</code>,
        the handler in <code className="font-mono">backend/handlers</code>, hook
        it up in <code className="font-mono">backend/routes/routes.go</code>,
        then mirror it on the frontend with a directory under{" "}
        <code className="font-mono">app/[tenant]/(dashboard)/&lt;name&gt;/</code> and a
        re-exporting <code className="font-mono">page.tsx</code>. Register it in{" "}
        <code className="font-mono">constants/navigation/modules.ts</code> to
        light it up in the dashboard grid.
      </Callout>
    </DocSection>
  );
}
