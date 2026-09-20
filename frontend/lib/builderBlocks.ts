// Block model + email-HTML compiler for the visual drag-and-drop email builder.
// Pure (no React) so it can be unit-reasoned about and reused by the canvas,
// the live preview, and the save path. The compiled output is table-based with
// inline styles (email-client safe) and preserves {{variable}} tokens, which
// the server substitutes at send time.

export type BlockType = "heading" | "text" | "button" | "image" | "divider" | "spacer";
export type Align = "left" | "center" | "right";

// Flat optional props keep the inspector + types simple; each type reads the
// fields it needs.
export interface Block {
  id: string;
  type: BlockType;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  align?: Align;
  color?: string;
  bg?: string;
  level?: "h1" | "h2" | "h3";
  width?: number;
  height?: number;
}

export const PALETTE: { type: BlockType; label: string }[] = [
  { type: "heading", label: "Heading" },
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "divider", label: "Divider" },
  { type: "spacer", label: "Spacer" },
];

let counter = 0;
export function newBlock(type: BlockType): Block {
  const id = `b${Date.now().toString(36)}_${counter++}`;
  switch (type) {
    case "heading":
      return { id, type, text: "Heading", level: "h1", align: "left", color: "#111111" };
    case "text":
      return { id, type, text: "Write your message here.", align: "left", color: "#374151" };
    case "button":
      return { id, type, text: "Click here", href: "#", align: "left", bg: "#4f46e5", color: "#ffffff" };
    case "image":
      return { id, type, src: "", alt: "", width: 240, align: "center", href: "" };
    case "divider":
      return { id, type, color: "#e6e8eb" };
    case "spacer":
      return { id, type, height: 24 };
  }
}

// starterBlocks gives a sensible, purpose-matched starting layout when a user
// opens the visual builder on a template that has no saved design yet, so the
// canvas is never blank. The CTA points at the template's relevant variable.
export function starterBlocks(templateKey: string): Block[] {
  const welcome = templateKey === "welcome";
  const ctaVar = welcome ? "loginUrl" : "acceptUrl";
  return [
    { ...newBlock("heading"), text: welcome ? "You're all set" : "Set up your account" },
    {
      ...newBlock("text"),
      text: welcome
        ? "Hello {{userName}}, your account on {{tenantName}} is ready to use."
        : "Hello {{userName}}, an account was created for you on {{tenantName}}. Choose a password to get started.",
    },
    { ...newBlock("button"), text: welcome ? "Sign in" : "Set my password", href: `{{${ctaVar}}}`, align: "left" },
  ];
}

export function parseDesign(json: string): Block[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as Block[]) : [];
  } catch {
    return [];
  }
}

function escapeHtml(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// textToHtml escapes user text and turns newlines into <br>. {{var}} tokens
// contain no HTML-special chars so they pass through untouched.
function textToHtml(s?: string): string {
  return escapeHtml(s ?? "").replace(/\n/g, "<br/>");
}

// renderBlockInner returns the inner HTML for one block (valid inside a <div>
// for the canvas, and wrapped in a table cell by compileEmail for sending).
export function renderBlockInner(b: Block): string {
  const align = b.align ?? "left";
  switch (b.type) {
    case "heading": {
      const tag = b.level ?? "h1";
      const size = tag === "h3" ? 16 : tag === "h2" ? 18 : 22;
      return `<${tag} style="margin:0;font-size:${size}px;font-weight:700;color:${b.color ?? "#111111"};text-align:${align}">${textToHtml(b.text)}</${tag}>`;
    }
    case "text":
      return `<p style="margin:0;font-size:15px;line-height:1.6;color:${b.color ?? "#374151"};text-align:${align}">${textToHtml(b.text)}</p>`;
    case "button":
      return `<div style="text-align:${align}"><a href="${escapeAttr(b.href ?? "#")}" style="display:inline-block;background:${b.bg ?? "#4f46e5"};color:${b.color ?? "#ffffff"};text-decoration:none;padding:12px 22px;border-radius:10px;font-size:15px;font-weight:600">${textToHtml(b.text)}</a></div>`;
    case "image": {
      const img = `<img src="${escapeAttr(b.src ?? "")}" alt="${escapeAttr(b.alt ?? "")}" width="${b.width ?? 240}" style="max-width:100%;border:0;display:inline-block"/>`;
      const inner = b.href ? `<a href="${escapeAttr(b.href)}">${img}</a>` : img;
      return `<div style="text-align:${align}">${inner}</div>`;
    }
    case "divider":
      return `<hr style="border:0;border-top:1px solid ${b.color ?? "#e6e8eb"};margin:0"/>`;
    case "spacer": {
      const h = b.height ?? 24;
      return `<div style="height:${h}px;line-height:${h}px;font-size:1px">&nbsp;</div>`;
    }
  }
}

// compileEmail turns the block list into a full, email-safe HTML document.
export function compileEmail(blocks: Block[]): string {
  const rows = blocks
    .map((b) => `<tr><td style="padding:0 0 16px">${renderBlockInner(b)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8"><tr><td align="center" style="padding:32px 24px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb">
<tr><td style="padding:32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr></table>
</td></tr></table>
</body></html>`;
}
