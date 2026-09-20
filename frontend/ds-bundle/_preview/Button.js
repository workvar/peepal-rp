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

  // .design-sync/previews/Button.tsx
  var Button_exports = {};
  __export(Button_exports, {
    Sizes: () => Sizes,
    States: () => States,
    Variants: () => Variants
  });
  init_define_import_meta_env();

  // components/ui/button.tsx
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

  // components/ui/button.tsx
  var import_react = __toESM(require_react_shim());
  var import_jsx_runtime = __toESM(require_react_shim());
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
  var Button = (0, import_react.forwardRef)(
    ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
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
            loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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

  // .design-sync/previews/Button.tsx
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var Variants = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "default", children: "Save changes" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "secondary", children: "Cancel" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "destructive", children: "Delete student" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "outline", children: "Export CSV" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "ghost", children: "Dismiss" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "link", children: "View details" })
  ] });
  var Sizes = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { size: "xs", children: "Extra small" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { size: "sm", children: "Small" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { size: "default", children: "Default" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { size: "lg", children: "Large" })
  ] });
  var States = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { loading: true, children: "Submitting…" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { disabled: true, children: "Disabled" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { variant: "destructive", loading: true, children: "Deleting…" })
  ] });
  return __toCommonJS(Button_exports);
})();
