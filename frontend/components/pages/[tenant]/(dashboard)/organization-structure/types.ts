// Shared types for the organisation-structure page.

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  photo_url?: string;
  manager_id?: string | null;
  department_id?: string | null;
  designation?: string;
}

export interface OrgNode extends OrgUser {
  children: OrgNode[];
}
