"use client";

// Email template designer: pick a system email type, edit it visually (drag and
// drop) or as raw HTML, preview live, then save / reset / test. Visual designs
// are stored as block JSON (design_json) and compiled to body_html for sending.

import { useEffect, useMemo, useRef, useState } from "react";
import { superAdminAPI } from "@/lib/api";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";
import { type EmailTemplate, sampleVars, substituteVars } from "@/lib/emailTemplate";
import { type Block, compileEmail, parseDesign, starterBlocks } from "@/lib/builderBlocks";
import TemplateEditor from "./TemplateEditor";
import TemplatePreview from "./TemplatePreview";
import EmailBuilder from "./EmailBuilder";
import { RotateCcw } from "lucide-react";

type Mode = "visual" | "html";

export default function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<Mode>("html");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bodyHtml, setBodyHtml] = useState("");
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => templates.find((t) => t.key === activeKey) ?? null, [templates, activeKey]);
  const vars = active ? sampleVars(active) : {};

  const initFrom = (t: EmailTemplate) => {
    setActiveKey(t.key);
    setSubject(t.subject);
    setBodyHtml(t.body_html);
    const design = parseDesign(t.design_json);
    setBlocks(design);
    setMode(design.length > 0 ? "visual" : "html");
  };

  const applyList = (list: EmailTemplate[], key: string) => {
    setTemplates(list);
    const sel = list.find((t) => t.key === key) ?? list[0];
    if (sel) initFrom(sel);
  };

  useEffect(() => {
    superAdminAPI
      .listEmailTemplates()
      .then((res) => applyList(res.data.data as EmailTemplate[], ""))
      .catch(() => {});
  }, []);

  const reload = async (key: string) => {
    const res = await superAdminAPI.listEmailTemplates();
    applyList(res.data.data as EmailTemplate[], key);
  };

  function toMode(next: Mode) {
    if (next === mode) return;
    // Going to HTML: surface the visual design as editable HTML (but never clobber
    // an untouched raw-HTML template with an empty compiled body).
    if (next === "html" && blocks.length > 0) setBodyHtml(compileEmail(blocks));
    // Going to Visual on an empty canvas: seed a purpose-matched starter layout.
    if (next === "visual" && blocks.length === 0 && active) setBlocks(starterBlocks(active.key));
    setMode(next);
  }

  const previewHtml = mode === "visual" ? compileEmail(blocks) : bodyHtml;

  const persist = () => {
    const isVisual = mode === "visual";
    return superAdminAPI.updateEmailTemplate(activeKey, {
      subject,
      body_html: isVisual ? compileEmail(blocks) : bodyHtml,
      body_text: "",
      design_json: isVisual ? JSON.stringify(blocks) : "",
    });
  };

  const onSave = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await persist();
      toast.success("Template saved");
      await reload(active.key);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to save template"));
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    if (!active) return;
    try {
      await superAdminAPI.resetEmailTemplate(active.key);
      toast.success("Reset to default");
      await reload(active.key);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to reset"));
    }
  };

  const onTest = async () => {
    if (!active) return;
    setTesting(true);
    try {
      await persist();
      await superAdminAPI.testEmailTemplate(active.key, testTo || undefined);
      toast.success("Test email sent");
      await reload(active.key);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Test failed"));
    } finally {
      setTesting(false);
    }
  };

  function insertSubjectVar(name: string) {
    const el = subjectRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      setSubject((s) => s + token);
      return;
    }
    const start = el.selectionStart ?? subject.length;
    const end = el.selectionEnd ?? subject.length;
    setSubject(subject.slice(0, start) + token + subject.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-5">
      <aside className="space-y-1.5">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => initFrom(t)}
            className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
              t.key === activeKey ? "border-indigo-300 bg-indigo-50" : "border-border hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{t.name}</span>
              {t.overridden && <span className="text-[10px] uppercase tracking-wide text-indigo-600">Custom</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
          </button>
        ))}
      </aside>

      {active && (
        <div>
          {/* Subject */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-foreground/80 mb-1">Subject</label>
            <input
              ref={subjectRef}
              className="input-field"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            {active.vars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {active.vars.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertSubjectVar(v.name)}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
                  >
                    {`{{${v.name}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div className="inline-flex rounded-lg border border-border p-0.5 mb-4">
            <ModeButton active={mode === "visual"} onClick={() => toMode("visual")}>
              Visual builder
            </ModeButton>
            <ModeButton active={mode === "html"} onClick={() => toMode("html")}>
              HTML
            </ModeButton>
          </div>

          {mode === "visual" ? (
            <EmailBuilder blocks={blocks} onChange={setBlocks} vars={active.vars} sample={vars} />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <TemplateEditor bodyHtml={bodyHtml} vars={active.vars} onBodyChange={setBodyHtml} />
              <div>
                <div className="text-sm font-medium text-foreground/80 mb-1">Preview</div>
                <div className="rounded-lg border border-border bg-white p-3">
                  <TemplatePreview html={previewHtml} vars={vars} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
            <button className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save template"}
            </button>
            <button className="btn-ghost flex items-center gap-1.5" onClick={onReset}>
              <RotateCcw size={14} /> Reset to default
            </button>
            <div className="ml-auto flex items-center gap-2">
              <input
                className="input-field w-56"
                type="email"
                placeholder="Send test to…"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <button className="btn-ghost" onClick={onTest} disabled={testing}>
                {testing ? "Sending..." : "Save & send test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active ? "bg-indigo-500 text-white" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
