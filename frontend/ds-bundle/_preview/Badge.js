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
      function jsx3(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs3(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx3;
      module.exports.jsxs = jsxs3;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs3 : jsx3)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Badge.tsx
  var Badge_exports = {};
  __export(Badge_exports, {
    InContext: () => InContext,
    StatusDots: () => StatusDots,
    Variants: () => Variants
  });
  init_define_import_meta_env();

  // components/ui/badge.tsx
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

  // components/ui/badge.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var variantClasses = {
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
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "span",
      {
        className: cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
          "text-xs font-semibold tracking-wide transition-all duration-150",
          variantClasses[variant] ?? variantClasses.default,
          className
        ),
        ...props,
        children: [
          dot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-current shrink-0", "aria-hidden": "true" }),
          children ?? label
        ]
      }
    );
  }

  // .design-sync/previews/Badge.tsx
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var Variants = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "default", children: "Default" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "secondary", children: "Secondary" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "destructive", children: "Destructive" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "outline", children: "Outline" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "success", children: "Success" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "warning", children: "Warning" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "purple", children: "Purple" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "blue", children: "Blue" })
  ] });
  var StatusDots = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "success", dot: true, children: "Active" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "warning", dot: true, children: "Pending" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "destructive", dot: true, children: "Overdue" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "secondary", dot: true, children: "Archived" })
  ] });
  var InContext = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between rounded-xl border border-border bg-card p-4 w-80", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm font-semibold text-foreground", children: "Fee Payment — Term 2" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-muted-foreground mt-0.5", children: "Due 12 Sep 2026" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Badge, { variant: "warning", dot: true, children: "Pending" })
  ] });
  return __toCommonJS(Badge_exports);
})();
