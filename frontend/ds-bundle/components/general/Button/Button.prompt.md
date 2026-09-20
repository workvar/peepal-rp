Button from collegeerp-frontend. Use via `window.WorkVarUI.Button` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="default">Save changes</Button>
    <Button variant="secondary">Cancel</Button>
    <Button variant="destructive">Delete student</Button>
    <Button variant="outline">Export CSV</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="link">View details</Button>
  </div>
)
```

### Sizes

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="xs">Extra small</Button>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
)
```

### States

```jsx
() => (
  <div className="flex flex-wrap items-center gap-3">
    <Button loading>Submitting…</Button>
    <Button disabled>Disabled</Button>
    <Button variant="destructive" loading>Deleting…</Button>
  </div>
)
```
