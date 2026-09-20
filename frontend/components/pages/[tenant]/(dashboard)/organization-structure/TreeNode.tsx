"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import UserCard from "./UserCard";
import type { OrgNode } from "./types";

interface Props {
  node: OrgNode;
  depth?: number;
  highlightId?: string | null;
  onSelect?: (id: string) => void;
}

// TreeNode is recursive: it draws the user, then any children indented by depth.
export default function TreeNode({ node, depth = 0, highlightId, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const hasKids = node.children.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground p-1 rounded"
          style={{ visibility: hasKids ? "visible" : "hidden" }}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1">
          <UserCard
            user={node}
            highlighted={highlightId === node.id}
            onClick={() => onSelect?.(node.id)}
          />
        </div>
      </div>
      {open && hasKids && (
        <div
          className="ml-4 pl-4 space-y-1"
          style={{ borderLeft: "1px dashed rgb(var(--border))" }}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              highlightId={highlightId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
