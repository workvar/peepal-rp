"use client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        {/* Gradient accent line above title */}
        <div
          className="w-8 h-0.5 rounded-full mb-2"
          style={{ background: "var(--color-category-violet)" }}
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 ml-4 shrink-0">{actions}</div>
      )}
    </div>
  );
}
