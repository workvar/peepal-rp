// Barrel re-exporting the existing doc primitives + diagrams so chapter files
// stay short. These live under the tenant docs tree but are pure/presentational.
export { default as Callout } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/Callout";
export { default as CodeBlock } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/CodeBlock";
export { default as DocSection } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/DocSection";
export { default as StepList } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/StepList";
export { default as StatGrid } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/StatGrid";
export { default as InlineKey } from "@/components/pages/[tenant]/(dashboard)/docs/_shared/InlineKey";

export { default as DiagramFrame } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/DiagramFrame";
export { default as ArchitectureDiagram } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/ArchitectureDiagram";
export { default as MultiTenancyDiagram } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/MultiTenancyDiagram";
export { default as AuthFlow } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/AuthFlow";
export { default as DataModelERD } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/DataModelERD";
export { default as ApprovalFlowDiagram } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/ApprovalFlowDiagram";
export { default as RequestLifecycle } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/RequestLifecycle";
export { default as ModuleMap } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/ModuleMap";
export { default as RepoStructureTree } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/RepoStructureTree";
export { default as RolePermissionMatrix } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/RolePermissionMatrix";
export { default as AttendanceFlowDiagram } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/AttendanceFlowDiagram";
export { default as StateChart } from "@/components/pages/[tenant]/(dashboard)/docs/diagrams/StateChart";
