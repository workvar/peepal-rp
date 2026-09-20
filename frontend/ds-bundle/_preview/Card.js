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

  // .design-sync/previews/Card.tsx
  var Card_exports = {};
  __export(Card_exports, {
    Default: () => Default,
    Raised: () => Raised
  });
  init_define_import_meta_env();

  // components/ui/card.tsx
  init_define_import_meta_env();

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

  // components/ui/card.tsx
  var import_react = __toESM(require_react_shim());
  var import_jsx_runtime = __toESM(require_react_shim());
  var Card = (0, import_react.forwardRef)(
    ({ className, variant = "default", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref,
        className: cn(
          "rounded-xl border border-border bg-card text-card-foreground",
          "transition-all duration-150",
          variant === "raised" && "shadow-md",
          className
        ),
        ...props
      }
    )
  );
  Card.displayName = "Card";
  var CardHeader = (0, import_react.forwardRef)(
    ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref, className: cn("flex flex-col space-y-1.5 p-5", className), ...props })
  );
  CardHeader.displayName = "CardHeader";
  var CardTitle = (0, import_react.forwardRef)(
    ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { ref, className: cn("text-base font-semibold leading-none tracking-tight text-foreground", className), ...props })
  );
  CardTitle.displayName = "CardTitle";
  var CardDescription = (0, import_react.forwardRef)(
    ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { ref, className: cn("text-sm text-muted-foreground", className), ...props })
  );
  CardDescription.displayName = "CardDescription";
  var CardContent = (0, import_react.forwardRef)(
    ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref, className: cn("p-5 pt-0", className), ...props })
  );
  CardContent.displayName = "CardContent";
  var CardFooter = (0, import_react.forwardRef)(
    ({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref, className: cn("flex items-center p-5 pt-0", className), ...props })
  );
  CardFooter.displayName = "CardFooter";

  // components/ui/button.tsx
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim());
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
  var Button = (0, import_react2.forwardRef)(
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

  // components/ui/badge.tsx
  init_define_import_meta_env();
  var import_jsx_runtime3 = __toESM(require_react_shim());
  var variantClasses2 = {
    default: "bg-primary/12 text-primary",
    secondary: "bg-muted text-muted-foreground",
    destructive: "bg-destructive/12 text-destructive",
    outline: "text-foreground border border-border",
    success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
    purple: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
    cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-400",
    pink: "bg-pink-500/12 text-pink-700 dark:text-pink-400",
    green: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    red: "bg-destructive/12 text-destructive",
    yellow: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
    blue: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
    gray: "bg-muted text-muted-foreground"
  };
  function Badge({ className, variant = "default", dot = false, label, children, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
      "span",
      {
        className: cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
          "text-xs font-semibold tracking-wide transition-all duration-150",
          variantClasses2[variant] ?? variantClasses2.default,
          className
        ),
        ...props,
        children: [
          dot && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-current shrink-0", "aria-hidden": "true" }),
          children ?? label
        ]
      }
    );
  }

  // .design-sync/previews/Card.tsx
  var import_jsx_runtime4 = __toESM(require_react_shim());
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Card, { className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardTitle, { children: "Student Enrollment" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardDescription, { children: "Fall Term 2026 admissions summary" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(CardContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-3xl font-bold text-foreground", children: "1,248" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-muted-foreground mt-1", children: "+86 since last term" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "outline", size: "sm", children: "View report" }) })
  ] });
  var Raised = () => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(Card, { variant: "raised", className: "w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(CardHeader, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardTitle, { children: "Fee Collection" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Badge, { variant: "success", dot: true, children: "On track" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CardDescription, { children: "Term 2 · Due 12 Sep 2026" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(CardContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-3xl font-bold text-foreground", children: "₹42.6L" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-muted-foreground mt-1", children: "of ₹58L collected" })
    ] })
  ] });
  return __toCommonJS(Card_exports);
})();
