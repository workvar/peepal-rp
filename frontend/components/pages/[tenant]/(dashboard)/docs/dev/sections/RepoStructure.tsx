"use client";

import DocSection from "../../_shared/DocSection";
import RepoStructureTree from "../../diagrams/RepoStructureTree";
import Callout from "../../_shared/Callout";
import InlineKey from "../../_shared/InlineKey";

/** Annotated visualisation of the repo tree. */
export default function RepoStructure() {
  return (
    <DocSection
      id="repo-structure"
      title="Repository layout"
      description="Two siblings: backend/ (Go service) and frontend/ (Next.js app). Everything else is documentation, scripts, postman collections."
    >
      <RepoStructureTree />

      <Callout variant="tip" title="The page-component pattern">
        <p className="mb-2">
          App-router files in <InlineKey>app/[tenant]/(dashboard)/&lt;module&gt;/page.tsx</InlineKey>{" "}
          are deliberately tiny — typically a single <code className="font-mono">export {"{"} default {"}"}</code> from{" "}
          <InlineKey>components/pages/[tenant]/(dashboard)/&lt;module&gt;/Page.tsx</InlineKey>.
        </p>
        <p>
          This keeps Next.js&apos;s file-system routing clean while letting the
          actual page split into multiple small components inside{" "}
          <InlineKey>components/pages/...</InlineKey>.
        </p>
      </Callout>
    </DocSection>
  );
}
