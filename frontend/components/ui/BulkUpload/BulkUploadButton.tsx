"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import BulkUploadDialog from "./BulkUploadDialog";
import type { DynamicFieldEntry } from "./EditableTable";

interface Props extends Omit<ButtonProps, "onClick"> {
  resource: string;
  onFinished?: (summary: { successful: number; failed: number; total: number }) => void;
  label?: string;
  dynamicOptions?: Record<string, DynamicFieldEntry>;
}

export default function BulkUploadButton({
  resource,
  onFinished,
  label = "Bulk Upload",
  variant = "outline",
  size,
  children,
  dynamicOptions,
  ...btnProps
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        {...btnProps}
      >
        <Upload size={16} />
        {children ?? label}
      </Button>
      <BulkUploadDialog
        resource={resource}
        open={open}
        onClose={() => setOpen(false)}
        onFinished={(s) => { onFinished?.(s); }}
        dynamicOptions={dynamicOptions}
      />
    </>
  );
}
