"use strict";
var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function np(p, k) {
        var o = {};
        for (var x in p) if (x !== "children") o[x] = p[x];
        if (k !== void 0) o.key = k;
        return o;
      }
      function jsx5(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs4(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx5;
      module.exports.jsxs = jsxs4;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs4 : jsx5)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Dialog.tsx
  var Dialog_exports = {};
  __export(Dialog_exports, {
    Confirm: () => Confirm,
    Form: () => Form
  });
  init_define_import_meta_env();

  // components/ui/dialog.tsx
  init_define_import_meta_env();
  var import_react3 = __toESM(require_react_shim());

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/lucide-react.js
  init_define_import_meta_env();

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim());

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_define_import_meta_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && array.indexOf(className) === index;
  }).join(" ");

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.js
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim());

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_define_import_meta_env();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => {
      return (0, import_react.createElement)(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          className: mergeClasses("lucide", className),
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react2.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
        ...props
      })
    );
    Component.displayName = `${iconName}`;
    return Component;
  };

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/x.js
  init_define_import_meta_env();
  var X = createLucideIcon("X", [
    ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
    ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
  ]);

  // lib/utils.ts
  init_define_import_meta_env();
  function cn(...classes) {
    const parts = [];
    for (const cls of classes) {
      if (cls) parts.push(...cls.split(/\s+/).filter(Boolean));
    }
    const seen = /* @__PURE__ */ new Map();
    for (const token of parts) {
      const key = token.replace(/^([\w-]+:)*/, "").replace(/-[^-/\[]+(\[.*?\])?$/, "");
      seen.set(`${token.replace(/-[^-/\[]+(\[.*?\])?$/, "")}`, token);
    }
    return parts.filter((t, i, arr) => arr.lastIndexOf(t) === i).join(" ");
  }

  // components/ui/dialog.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  function Dialog({ open, onOpenChange, children }) {
    (0, import_react3.useEffect)(() => {
      if (!open) return;
      const onKey = (e) => {
        if (e.key === "Escape") onOpenChange(false);
      };
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }, [open, onOpenChange]);
    if (!open) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
  }
  var sizes = {
    xs: "max-w-xs",
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };
  var accentGradients = {
    violet: "#1f5d36",
    cyan: "#0891b2",
    red: "#dc2626",
    green: "#059669",
    amber: "#d97706"
  };
  function DialogContent({
    className,
    size = "md",
    onClose,
    accent = "violet",
    children,
    ...props
  }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          className: "absolute inset-0 animate-overlay-in",
          style: {
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(14px) saturate(130%)",
            WebkitBackdropFilter: "blur(14px) saturate(130%)"
          },
          onClick: onClose
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "div",
        {
          role: "dialog",
          "aria-modal": "true",
          className: cn(
            "relative w-full mx-4 max-h-[90vh]",
            sizes[size],
            "flex flex-col overflow-hidden",
            "animate-dialog-in",
            className
          ),
          style: {
            background: "rgb(var(--card))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "1.5rem",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
          },
          ...props,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "div",
              {
                className: "absolute top-0 left-0 right-0 h-[3px] z-10",
                style: {
                  background: accentGradients[accent],
                  borderRadius: "1.5rem 1.5rem 0 0"
                }
              }
            ),
            onClose && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                onClick: onClose,
                className: "absolute top-4 right-4 z-20 w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 hover:scale-110 active:scale-95",
                children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { size: 15 })
              }
            ),
            children
          ]
        }
      )
    ] });
  }
  function DialogHeader({ className, icon, children, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: cn("flex items-center gap-4 px-7 pt-8 pb-5 shrink-0", className),
        ...props,
        children: [
          icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
              style: {
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.2)"
              },
              children: icon
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1 min-w-0", children })
        ]
      }
    );
  }
  function DialogTitle({ className, children, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "h3",
      {
        className: cn("text-lg font-bold tracking-tight text-foreground leading-tight", className),
        ...props,
        children
      }
    );
  }
  function DialogDescription({ className, children, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: cn("text-sm text-muted-foreground mt-1", className), ...props, children });
  }
  function DialogBody({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: cn("px-7 py-5 overflow-y-auto flex-1", className),
        ...props
      }
    );
  }
  function DialogFooter({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: cn(
          "flex items-center justify-end gap-3 px-7 py-5 shrink-0",
          className
        ),
        style: {
          borderTop: "1px solid rgb(var(--border) / 0.6)",
          background: "rgb(var(--muted) / 0.3)"
        },
        ...props
      }
    );
  }
  function DialogGrid({ cols = 2, children, className }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn(cols === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4", className), children });
  }
  function DialogField({ label, error, required, children }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "block text-sm font-medium text-foreground", children: [
        label,
        required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-destructive ml-0.5", children: "*" })
      ] }),
      children,
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-xs text-destructive mt-1 font-medium", children: error })
    ] });
  }

  // components/ui/button.tsx
  init_define_import_meta_env();
  var import_react4 = __toESM(require_react_shim());
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var variantClasses = {
    default: "btn-primary",
    secondary: "btn-secondary",
    destructive: "btn-error",
    outline: "btn-outline",
    ghost: "btn-ghost",
    link: "btn bg-transparent text-primary hover:underline underline-offset-4 px-0"
  };
  var sizeClasses = {
    default: "",
    sm: "btn-sm",
    lg: "btn-lg",
    xs: "btn-xs",
    icon: "h-9 w-9 !p-0 rounded-xl"
  };
  var Button = (0, import_react4.forwardRef)(
    ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          ref,
          disabled: disabled || loading,
          "aria-busy": loading || void 0,
          className: cn(
            "btn",
            variantClasses[variant],
            sizeClasses[size],
            className
          ),
          ...props,
          children: [
            loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "span",
              {
                className: "w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0",
                "aria-hidden": "true"
              }
            ),
            children
          ]
        }
      );
    }
  );
  Button.displayName = "Button";

  // components/ui/input.tsx
  init_define_import_meta_env();
  var import_react5 = __toESM(require_react_shim());
  var import_jsx_runtime3 = __toESM(require_react_shim());
  var Input = (0, import_react5.forwardRef)(
    ({ className, type, ...props }, ref) => {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          type,
          ref,
          className: cn(
            "flex h-10 w-full rounded-xl border border-input bg-secondary px-3 py-2 text-sm",
            "text-foreground placeholder:text-muted-foreground",
            "ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-150",
            className
          ),
          ...props
        }
      );
    }
  );
  Input.displayName = "Input";

  // .design-sync/previews/Dialog.tsx
  var import_jsx_runtime4 = __toESM(require_react_shim());
  var CardHeight = ({ children }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { height: 700 }, children });
  var Confirm = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardHeight, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Dialog, { open: true, onOpenChange: () => {
  }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogContent, { size: "sm", onClose: () => {
  }, accent: "red", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogTitle, { children: "Remove student?" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogDescription, { children: "This unenrolls Ananya Sharma from Fall Term 2026. This can't be undone." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogFooter, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "secondary", children: "Cancel" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "destructive", children: "Remove" })
    ] })
  ] }) }) });
  var Form = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardHeight, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Dialog, { open: true, onOpenChange: () => {
  }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogContent, { size: "md", onClose: () => {
  }, accent: "violet", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogTitle, { children: "New admission" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogDescription, { children: "Add a student to the current academic term." })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogBody, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogGrid, { cols: 2, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogField, { label: "Full name", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Input, { placeholder: "Ananya Sharma" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogField, { label: "Roll number", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Input, { placeholder: "24CS1042" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogField, { label: "Email", error: "Enter a valid email address", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Input, { placeholder: "student@collerp.edu" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DialogField, { label: "Guardian contact", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Input, { placeholder: "+91 98765 43210" }) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(DialogFooter, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "secondary", children: "Cancel" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { children: "Save admission" })
    ] })
  ] }) }) });
  return __toCommonJS(Dialog_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/x.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.439.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
