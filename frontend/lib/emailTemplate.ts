// Shared types + helpers for the super-admin email template designer.

export interface TemplateVar {
  name: string;
  description: string;
  sample: string;
}

export interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  vars: TemplateVar[];
  subject: string;
  body_html: string;
  body_text: string;
  design_json: string;
  default_subject: string;
  default_html: string;
  default_text: string;
  overridden: boolean;
}

// substituteVars replaces {{name}} placeholders with values. Used for the live
// preview; the server does the same substitution at send time.
export function substituteVars(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

// sampleVars builds a {name: sample} map from a template's declared variables.
export function sampleVars(t: EmailTemplate): Record<string, string> {
  const m: Record<string, string> = {};
  for (const v of t.vars) m[v.name] = v.sample;
  return m;
}
