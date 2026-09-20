"use client";

import { useRef } from "react";
import type { Block, Align } from "@/lib/builderBlocks";
import type { TemplateVar } from "@/lib/emailTemplate";
import { Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

// Right-hand property panel for the selected block. Text-like fields report
// focus so the variable chips can insert a {{token}} at the caret.
interface Props {
  block: Block | null;
  vars: TemplateVar[];
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
}

type TextKey = "text" | "href" | "src" | "alt";

export default function BlockInspector({ block, vars, onChange, onDelete }: Props) {
  const active = useRef<{ key: TextKey; el: HTMLInputElement | HTMLTextAreaElement } | null>(null);

  if (!block) {
    return (
      <div className="text-sm text-muted-foreground p-4 rounded-lg border border-dashed border-border">
        Select a block to edit it, or drag a new one in from the left.
      </div>
    );
  }

  function insertVar(name: string) {
    const token = `{{${name}}}`;
    const af = active.current;
    if (!af) return;
    const cur = (block?.[af.key] as string) ?? "";
    const start = af.el.selectionStart ?? cur.length;
    const end = af.el.selectionEnd ?? cur.length;
    onChange({ [af.key]: cur.slice(0, start) + token + cur.slice(end) } as Partial<Block>);
    requestAnimationFrame(() => {
      af.el.focus();
      const pos = start + token.length;
      af.el.setSelectionRange(pos, pos);
    });
  }

  const supportsVars = ["heading", "text", "button", "image"].includes(block.type);

  const text = (key: TextKey, label: string, multiline = false) => {
    const common = {
      value: (block[key] as string) ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ [key]: e.target.value } as Partial<Block>),
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        active.current = { key, el: e.target };
      },
      className: "input-field" + (multiline ? " min-h-[80px]" : ""),
    };
    return (
      <Field label={label}>
        {multiline ? <textarea {...common} /> : <input {...common} />}
      </Field>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize">{block.type}</span>
        <button onClick={onDelete} className="text-red-600 hover:text-red-800" title="Delete block">
          <Trash2 size={15} />
        </button>
      </div>

      {block.type === "heading" && (
        <>
          {text("text", "Text")}
          <Field label="Size">
            <select
              className="input-field"
              value={block.level ?? "h1"}
              onChange={(e) => onChange({ level: e.target.value as Block["level"] })}
            >
              <option value="h1">Large</option>
              <option value="h2">Medium</option>
              <option value="h3">Small</option>
            </select>
          </Field>
          <AlignRow block={block} onChange={onChange} />
          <ColorRow label="Text colour" value={block.color ?? "#111111"} onChange={(c) => onChange({ color: c })} />
        </>
      )}

      {block.type === "text" && (
        <>
          {text("text", "Text", true)}
          <AlignRow block={block} onChange={onChange} />
          <ColorRow label="Text colour" value={block.color ?? "#374151"} onChange={(c) => onChange({ color: c })} />
        </>
      )}

      {block.type === "button" && (
        <>
          {text("text", "Label")}
          {text("href", "Link URL")}
          <AlignRow block={block} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <ColorRow label="Button" value={block.bg ?? "#4f46e5"} onChange={(c) => onChange({ bg: c })} />
            <ColorRow label="Text" value={block.color ?? "#ffffff"} onChange={(c) => onChange({ color: c })} />
          </div>
        </>
      )}

      {block.type === "image" && (
        <>
          {text("src", "Image URL")}
          {text("alt", "Alt text")}
          {text("href", "Link URL (optional)")}
          <Field label="Width (px)">
            <input
              type="number"
              className="input-field"
              value={block.width ?? 240}
              onChange={(e) => onChange({ width: parseInt(e.target.value, 10) || 0 })}
            />
          </Field>
          <AlignRow block={block} onChange={onChange} />
        </>
      )}

      {block.type === "divider" && (
        <ColorRow label="Colour" value={block.color ?? "#e6e8eb"} onChange={(c) => onChange({ color: c })} />
      )}

      {block.type === "spacer" && (
        <Field label="Height (px)">
          <input
            type="number"
            className="input-field"
            value={block.height ?? 24}
            onChange={(e) => onChange({ height: parseInt(e.target.value, 10) || 0 })}
          />
        </Field>
      )}

      {supportsVars && vars.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Insert into the focused field:</p>
          <div className="flex flex-wrap gap-1.5">
            {vars.map((v) => (
              <button
                key={v.name}
                type="button"
                title={v.description}
                onMouseDown={(e) => e.preventDefault() /* keep field focus */}
                onClick={() => insertVar(v.name)}
                className="text-xs font-mono px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100"
              >
                {`{{${v.name}}}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-border" />
        <input className="input-field flex-1" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

function AlignRow({ block, onChange }: { block: Block; onChange: (patch: Partial<Block>) => void }) {
  const opts: { v: Align; Icon: typeof AlignLeft }[] = [
    { v: "left", Icon: AlignLeft },
    { v: "center", Icon: AlignCenter },
    { v: "right", Icon: AlignRight },
  ];
  return (
    <Field label="Align">
      <div className="flex gap-1">
        {opts.map(({ v, Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange({ align: v })}
            className={`flex-1 flex items-center justify-center py-2 rounded-md border ${
              (block.align ?? "left") === v ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
    </Field>
  );
}
