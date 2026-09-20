"use client";

import { useLogout } from "@/store/hooks/useLogout";
import { useTheme } from "@/context/ThemeContext";
import Switch from "@/components/ui/switch";
import { LogOut, Sun } from "lucide-react";

export default function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const logout = useLogout();

  const handleLogout = () => logout("/login");

  return (
    <div className="px-3 py-3 space-y-1 border-t border-border">
      {mounted && !collapsed && (
        <div className="flex items-center justify-between px-1 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sun size={14} className="shrink-0" />
            Dark Mode
          </span>
          <Switch checked={theme === "dark"} onChange={toggleTheme} size="sm" />
        </div>
      )}

      {mounted && collapsed && (
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="flex w-full items-center justify-center rounded-xl py-2.5 text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Sun size={16} />
        </button>
      )}

      <button
        onClick={handleLogout}
        title={collapsed ? "Logout" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150 ${
          collapsed ? "justify-center px-2" : "px-2"
        }`}
      >
        <LogOut size={15} className="shrink-0" />
        {!collapsed && "Logout"}
      </button>
    </div>
  );
}
