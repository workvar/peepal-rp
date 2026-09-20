Input from collegeerp-frontend. Use via `window.WorkVarUI.Input` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Default

```jsx
() => (
  <div className="w-72 space-y-3">
    <Input placeholder="Search students…" />
    <Input defaultValue="jane.doe@collerp.edu" type="email" />
  </div>
)
```

### States

```jsx
() => (
  <div className="w-72 space-y-3">
    <Input placeholder="Roll number" disabled />
    <Input type="password" defaultValue="••••••••" />
  </div>
)
```
