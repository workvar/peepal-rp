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
      function jsx4(t, p, k) {
        var c = p && p.children;
        return c === void 0 ? R.createElement(t, np(p, k)) : R.createElement(t, np(p, k), c);
      }
      function jsxs4(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx4;
      module.exports.jsxs = jsxs4;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs4 : jsx4)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Tooltip.tsx
  var Tooltip_exports = {};
  __export(Tooltip_exports, {
    Default: () => Default
  });
  init_define_import_meta_env();

  // components/ui/tooltip.tsx
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim());

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

  // components/ui/tooltip.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  function Tooltip({ content, children, side = "top", className }) {
    const [visible, setVisible] = (0, import_react.useState)(false);
    const ref = (0, import_react.useRef)(null);
    const sideClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
      bottom: "top-full  left-1/2 -translate-x-1/2 mt-2",
      left: "right-full top-1/2 -translate-y-1/2 mr-2",
      right: "left-full  top-1/2 -translate-y-1/2 ml-2"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        ref,
        className: "relative inline-flex",
        onMouseEnter: () => setVisible(true),
        onMouseLeave: () => setVisible(false),
        onFocus: () => setVisible(true),
        onBlur: () => setVisible(false),
        children: [
          children,
          visible && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: cn(
                "absolute z-50 pointer-events-none",
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
                "bg-foreground text-background shadow-lg",
                "animate-in fade-in zoom-in-95 duration-150",
                sideClasses[side],
                className
              ),
              children: content
            }
          )
        ]
      }
    );
  }

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

  // .design-sync/previews/Tooltip.tsx
  var import_jsx_runtime3 = __toESM(require_react_shim());
  var Default = () => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-center gap-6 p-8", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: "Export the current roster as CSV", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { variant: "outline", size: "sm", children: "Export" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tooltip, { content: "Archived students are hidden from search", side: "bottom", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-sm text-muted-foreground underline decoration-dotted cursor-help", children: "Why can't I see archived students?" }) })
  ] });
  return __toCommonJS(Tooltip_exports);
})();
