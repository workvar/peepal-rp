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

  // .design-sync/previews/Switch.tsx
  var Switch_exports = {};
  __export(Switch_exports, {
    OnOff: () => OnOff,
    Sizes: () => Sizes,
    WithLabel: () => WithLabel
  });
  init_define_import_meta_env();

  // components/ui/switch.tsx
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

  // components/ui/switch.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var cfg = {
    sm: {
      track: "w-8 h-5",
      thumb: "w-3.5 h-3.5",
      thumbOn: "translate-x-[15px]",
      thumbOff: "translate-x-[3px]"
    },
    md: {
      track: "w-11 h-6",
      thumb: "w-4 h-4",
      thumbOn: "translate-x-[24px]",
      thumbOff: "translate-x-[4px]"
    }
  };
  function Switch({
    checked,
    onCheckedChange,
    onChange,
    disabled = false,
    size = "md",
    className,
    label,
    labelPosition = "right",
    id
  }) {
    const c = cfg[size];
    const handleClick = () => {
      if (disabled) return;
      const next = !checked;
      onCheckedChange?.(next);
      onChange?.(next);
    };
    const track = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "button",
      {
        id,
        type: "button",
        role: "switch",
        "aria-checked": checked,
        disabled,
        onClick: handleClick,
        className: cn(
          "relative inline-flex shrink-0 items-center rounded-full cursor-pointer",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          c.track,
          checked ? "bg-primary" : "bg-muted-foreground/30",
          className
        ),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "span",
          {
            className: cn(
              "pointer-events-none block rounded-full bg-white shadow-sm",
              "transition-transform duration-200",
              c.thumb,
              checked ? c.thumbOn : c.thumbOff
            )
          }
        )
      }
    );
    if (!label) return track;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "label",
      {
        className: cn(
          "inline-flex items-center gap-2.5 select-none",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        ),
        children: [
          labelPosition === "left" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm font-medium text-foreground", children: label }),
          track,
          labelPosition === "right" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-sm font-medium text-foreground", children: label })
        ]
      }
    );
  }

  // .design-sync/previews/Switch.tsx
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var OnOff = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: true, onCheckedChange: () => {
    } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: false, onCheckedChange: () => {
    } })
  ] });
  var WithLabel = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: true, onCheckedChange: () => {
    }, label: "Email notifications" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: false, onCheckedChange: () => {
    }, label: "SMS alerts", labelPosition: "left" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: true, onCheckedChange: () => {
    }, label: "Auto-approve leave requests", disabled: true })
  ] });
  var Sizes = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-6", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: true, onCheckedChange: () => {
    }, size: "sm" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Switch, { checked: true, onCheckedChange: () => {
    }, size: "md" })
  ] });
  return __toCommonJS(Switch_exports);
})();
