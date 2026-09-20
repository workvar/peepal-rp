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
      function jsxs2(t, p, k) {
        return R.createElement.apply(R, [t, np(p, k)].concat(p.children));
      }
      module.exports = R;
      module.exports.jsx = jsx3;
      module.exports.jsxs = jsxs2;
      module.exports.jsxDEV = function(t, p, k, s) {
        return (s ? jsxs2 : jsx3)(t, p, k);
      };
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/Skeleton.tsx
  var Skeleton_exports = {};
  __export(Skeleton_exports, {
    CardLoading: () => CardLoading,
    TextLines: () => TextLines
  });
  init_define_import_meta_env();

  // components/ui/skeleton.tsx
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

  // components/ui/skeleton.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  function Skeleton({ className, ...props }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        className: cn(
          "rounded-xl bg-muted animate-skeleton",
          className
        ),
        ...props
      }
    );
  }

  // .design-sync/previews/Skeleton.tsx
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var TextLines = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "w-64 space-y-2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-4 w-3/4" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-4 w-full" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-4 w-1/2" })
  ] });
  var CardLoading = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "w-72 rounded-xl border border-border bg-card p-4 space-y-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-10 w-10 rounded-full" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1 space-y-2", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-3.5 w-2/3" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-3 w-1/3" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Skeleton, { className: "h-24 w-full" })
  ] });
  return __toCommonJS(Skeleton_exports);
})();
