"use client";

import { useRef } from "react";
import type { TemplateVar } from "@/lib/emailTemplate";

// Raw HTML-body editor with clickable variable chips that insert a
// {{placeholder}} at the cursor. The subject is edited by the parent.
interface Props {
  bodyHtml: string;
  vars: TemplateVar[];
  onBodyChange: (v: string) => void;
}

export default function TemplateEditor({ bodyHtml, vars, onBodyChange }: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const el = bodyRef.current;
    if (!el) {
      onBodyChange(bodyHtml + token);
      return;
    }
    const start = el.selectionStart ?? bodyHtml.length;
    const end = el.selectionEnd ?? bodyHtml.length;
    onBodyChange(bodyHtml.slice(0, start) + token + bodyHtml.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground/80 mb-1">HTML body</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {vars.map((v) => (
            <button
              key={v.name}
              type="button"
              title={v.description}
              onClick={() => insertVar(v.name)}
              className="text-xs font-mono px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
            >
              {`{{${v.name}}}`}
            </button>
          ))}
        </div>
        <textarea
          ref={bodyRef}
          value={bodyHtml}
          onChange={(e) => onBodyChange(e.target.value)}
          spellCheck={false}
          className="input-field font-mono text-xs leading-relaxed min-h-[420px] w-full"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Click a variable to insert it. Values are filled in when the email is sent.
        </p>
      </div>
    </div>
  );
}
