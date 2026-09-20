// components/auth/theme.ts — the login screens' shared palette.
//
// The login screens are styled inline rather than with the dashboard's Tailwind
// tokens: they render before any session or tenant theme is known, so they
// cannot depend on CSS variables the dashboard sets up. Keeping the values here
// means the passkey controls and the password form stay visually identical
// without either file copying the other's hex codes.

export const C = {
  bg: "#F2F2F7",
  surface: "#FFFFFF",
  blue: "#007AFF",
  red: "#FF3B30",
  green: "#34C759",
  label: "#1C1C1E",
  placeholder: "#8E8E93",
  fill: "#F2F2F7",
  separator: "#E5E5EA",
};

export const FONT =
  '-apple-system, "SF Pro Display", "SF Pro Text", BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

/** The shared text-field style, so every input on the screen matches. */
export const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "12px 14px",
  fontSize: "16px",
  fontFamily: FONT,
  color: C.label,
  backgroundColor: focused ? C.surface : C.fill,
  border: `1.5px solid ${focused ? C.blue : C.separator}`,
  borderRadius: "10px",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: focused ? "0 0 0 4px rgba(0,122,255,0.12)" : "none",
  transition:
    "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
});
