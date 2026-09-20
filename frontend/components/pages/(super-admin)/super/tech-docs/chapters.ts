import Introduction from "./chapters/Introduction";
import Architecture from "./chapters/Architecture";
import MultiTenancy from "./chapters/MultiTenancy";
import AuthZ from "./chapters/AuthZ";
import AccessControl from "./chapters/AccessControl";
import SubscriptionsModules from "./chapters/SubscriptionsModules";
import DataModel from "./chapters/DataModel";
import Approvals from "./chapters/Approvals";
import RequestFlow from "./chapters/RequestFlow";
import Modules from "./chapters/Modules";
import DevOps from "./chapters/DevOps";
import Glossary from "./chapters/Glossary";

export interface Chapter {
  id: string;
  title: string;
  blurb: string;
  Component: React.ComponentType;
}

export const CHAPTERS: Chapter[] = [
  { id: "intro",       title: "Introduction & Onboarding",   blurb: "What Peepal is",            Component: Introduction },
  { id: "architecture",title: "System Architecture",          blurb: "Tiers & repo layout",        Component: Architecture },
  { id: "tenancy",     title: "Multi-Tenancy",                blurb: "Tenant isolation",           Component: MultiTenancy },
  { id: "auth",        title: "Authentication & Authorization",blurb: "Login, cookies, roles",     Component: AuthZ },
  { id: "access",      title: "Access Control & Gating",      blurb: "Per-action matrix",          Component: AccessControl },
  { id: "subscriptions", title: "Subscriptions, Modules & Quotas", blurb: "Plans, module gating, limits", Component: SubscriptionsModules },
  { id: "data-model",  title: "Data Model",                   blurb: "Tables & relations",         Component: DataModel },
  { id: "approvals",   title: "The Approval Engine",          blurb: "How approvals work",         Component: Approvals },
  { id: "data-flow",   title: "Request Data Flow",            blurb: "Client → GraphQL → DB",      Component: RequestFlow },
  { id: "modules",     title: "Modules Reference",            blurb: "Functional areas",           Component: Modules },
  { id: "devops",      title: "Local Dev & Deployment",       blurb: "Run & ship it",              Component: DevOps },
  { id: "glossary",    title: "Glossary",                     blurb: "Key terms",                  Component: Glossary },
];
