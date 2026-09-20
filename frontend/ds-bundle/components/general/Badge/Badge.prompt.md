Badge from collegeerp-frontend. Use via `window.WorkVarUI.Badge` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Variants

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="success">Success</Badge>
    <Badge variant="warning">Warning</Badge>
    <Badge variant="purple">Purple</Badge>
    <Badge variant="blue">Blue</Badge>
  </div>
)
```

### StatusDots

```jsx
() => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="success" dot>Active</Badge>
    <Badge variant="warning" dot>Pending</Badge>
    <Badge variant="destructive" dot>Overdue</Badge>
    <Badge variant="secondary" dot>Archived</Badge>
  </div>
)
```

### InContext

```jsx
() => (
  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 w-80">
    <div>
      <p className="text-sm font-semibold text-foreground">Fee Payment — Term 2</p>
      <p className="text-xs text-muted-foreground mt-0.5">Due 12 Sep 2026</p>
    </div>
    <Badge variant="warning" dot>Pending</Badge>
  </div>
)
```
