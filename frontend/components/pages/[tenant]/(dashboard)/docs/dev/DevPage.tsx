"use client";

import PageHeader from "@/components/ui/PageHeader";
import OnPageNav from "../_shared/OnPageNav";
import Overview from "./sections/Overview";
import TechStack from "./sections/TechStack";
import RepoStructure from "./sections/RepoStructure";
import ArchitectureSection from "./sections/ArchitectureSection";
import BackendSection from "./sections/BackendSection";
import FrontendSection from "./sections/FrontendSection";
import DataModelSection from "./sections/DataModelSection";
import AuthSection from "./sections/AuthSection";
import MultiTenancySection from "./sections/MultiTenancySection";
import ApprovalEngineSection from "./sections/ApprovalEngineSection";
import ApiConventionsSection from "./sections/ApiConventionsSection";
import ModulesSection from "./sections/ModulesSection";
import DevWorkflowSection from "./sections/DevWorkflowSection";
import DeploymentSection from "./sections/DeploymentSection";
import GlossarySection from "./sections/GlossarySection";

const anchors = [
  { id: "overview",       label: "Overview" },
  { id: "tech-stack",     label: "Tech stack" },
  { id: "repo-structure", label: "Repository layout" },
  { id: "architecture",   label: "Architecture" },
  { id: "backend",        label: "Backend" },
  { id: "frontend",       label: "Frontend" },
  { id: "data-model",     label: "Data model" },
  { id: "auth",           label: "Auth" },
  { id: "multi-tenancy",  label: "Multi-tenancy" },
  { id: "approvals",      label: "Approvals" },
  { id: "api",            label: "API conventions" },
  { id: "modules",        label: "Modules" },
  { id: "dev-workflow",   label: "Local dev" },
  { id: "deployment",     label: "Deployment" },
  { id: "glossary",       label: "Glossary" },
];

/** Long-form developer documentation. Each section is its own small file. */
export default function DevPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px] gap-8">
      <div className="min-w-0">
        <PageHeader
          title="Developer Documentation"
          subtitle="Architecture, internals and workflow for everyone hacking on Peepal."
        />
        <Overview />
        <TechStack />
        <RepoStructure />
        <ArchitectureSection />
        <BackendSection />
        <FrontendSection />
        <DataModelSection />
        <AuthSection />
        <MultiTenancySection />
        <ApprovalEngineSection />
        <ApiConventionsSection />
        <ModulesSection />
        <DevWorkflowSection />
        <DeploymentSection />
        <GlossarySection />
      </div>
      <aside className="hidden xl:block">
        <OnPageNav anchors={anchors} />
      </aside>
    </div>
  );
}
