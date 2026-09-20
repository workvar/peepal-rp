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

  // .design-sync/previews/Select.tsx
  var Select_exports = {};
  __export(Select_exports, {
    Placeholder: () => Placeholder,
    WithValueAndGroups: () => WithValueAndGroups
  });
  init_define_import_meta_env();

  // components/ui/select.tsx
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

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/check.js
  init_define_import_meta_env();
  var Check = createLucideIcon("Check", [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]]);

  // node_modules/.pnpm/lucide-react@0.439.0_react@18.3.1/node_modules/lucide-react/dist/esm/icons/chevron-down.js
  init_define_import_meta_env();
  var ChevronDown = createLucideIcon("ChevronDown", [
    ["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]
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

  // components/ui/select.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var Ctx = (0, import_react3.createContext)(null);
  var useSelectCtx = () => {
    const c = (0, import_react3.useContext)(Ctx);
    if (!c) throw new Error("Select sub-component used outside <Select />");
    return c;
  };
  function Select({ value, defaultValue = "", onValueChange, children, disabled }) {
    const [internal, setInternal] = (0, import_react3.useState)(defaultValue);
    const [open, setOpen] = (0, import_react3.useState)(false);
    const [labels, setLabels] = (0, import_react3.useState)({});
    const controlled = value !== void 0;
    const current = controlled ? value : internal;
    const handleSelect = (v) => {
      if (!controlled) setInternal(v);
      onValueChange?.(v);
      setOpen(false);
    };
    const registerLabel = (v, l) => {
      setLabels((prev) => prev[v] === l ? prev : { ...prev, [v]: l });
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ctx.Provider, { value: {
      value: current,
      open,
      onSelect: handleSelect,
      setOpen: disabled ? () => {
      } : setOpen,
      label: (v) => labels[v] ?? v,
      setLabel: registerLabel
    }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "relative", "data-disabled": disabled || void 0, children }) });
  }
  var SelectTrigger = (0, import_react3.forwardRef)(
    ({ placeholder = "Select…", className, ...props }, ref) => {
      const { value, open, setOpen, label } = useSelectCtx();
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          ref,
          type: "button",
          "aria-haspopup": "listbox",
          "aria-expanded": open,
          onClick: () => setOpen(!open),
          className: cn(
            "flex h-10 w-full items-center justify-between rounded-xl px-3 py-2 text-sm",
            "border border-input bg-card text-foreground",
            "ring-offset-background transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-primary/40",
            open && "border-primary/60 ring-2 ring-ring/30",
            className
          ),
          ...props,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn(!value && "text-muted-foreground"), children: value ? label(value) : placeholder }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              ChevronDown,
              {
                size: 15,
                className: cn(
                  "text-muted-foreground shrink-0 transition-transform duration-200",
                  open && "rotate-180"
                )
              }
            )
          ]
        }
      );
    }
  );
  SelectTrigger.displayName = "SelectTrigger";
  function SelectContent({ children, className }) {
    const { open, setOpen } = useSelectCtx();
    const ref = (0, import_react3.useRef)(null);
    (0, import_react3.useEffect)(() => {
      if (!open) return;
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open, setOpen]);
    if (!open) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref,
        role: "listbox",
        className: cn(
          "absolute z-50 top-full mt-1.5 w-full",
          "rounded-xl border border-border bg-card shadow-xl",
          "overflow-auto max-h-60 p-1",
          "slide-in-from-top animate-in duration-150",
          className
        ),
        children
      }
    );
  }
  function SelectItem({ value, children, className }) {
    const { value: current, onSelect, setLabel } = useSelectCtx();
    const selected = current === value;
    (0, import_react3.useEffect)(() => {
      if (typeof children === "string") setLabel(value, children);
    }, [value, children, setLabel]);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        role: "option",
        "aria-selected": selected,
        onClick: () => onSelect(value),
        className: cn(
          "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm",
          "text-foreground transition-colors duration-100",
          "hover:bg-primary/8 focus:bg-primary/8",
          selected && "bg-primary/12 font-semibold text-primary",
          className
        ),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "flex-1", children }),
          selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { size: 14, className: "text-primary shrink-0 ml-2" })
        ]
      }
    );
  }
  function SelectGroup({ children }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "py-1", children });
  }
  function SelectLabel({ children, className }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground", className), children });
  }
  function SelectSeparator({ className }) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("my-1 h-px bg-border", className) });
  }

  // .design-sync/previews/Select.tsx
  var import_jsx_runtime2 = __toESM(require_react_shim());
  var Placeholder = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-64", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Select, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectTrigger, { placeholder: "Select department…" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(SelectContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "cs", children: "Computer Science" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "ee", children: "Electrical Engineering" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "me", children: "Mechanical Engineering" })
    ] })
  ] }) });
  var WithValueAndGroups = () => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-64", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(Select, { defaultValue: "Computer Science", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectTrigger, {}),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(SelectContent, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(SelectGroup, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectLabel, { children: "Engineering" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "Computer Science", children: "Computer Science" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "Electrical Engineering", children: "Electrical Engineering" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectSeparator, {}),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(SelectGroup, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectLabel, { children: "Sciences" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "Physics", children: "Physics" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SelectItem, { value: "Chemistry", children: "Chemistry" })
      ] })
    ] })
  ] }) });
  return __toCommonJS(Select_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/check.js:
lucide-react/dist/esm/icons/chevron-down.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.439.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
