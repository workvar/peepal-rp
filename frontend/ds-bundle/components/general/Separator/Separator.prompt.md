Separator from collegeerp-frontend. Use via `window.WorkVarUI.Separator` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Horizontal

```jsx
() => (
  <div className="w-72">
    <p className="text-sm font-medium text-foreground">Academic Records</p>
    <Separator className="my-3" />
    <p className="text-sm font-medium text-foreground">Fee History</p>
  </div>
)
```

### Vertical

```jsx
() => (
  <div className="flex items-center gap-4 h-8">
    <span className="text-sm text-foreground">Profile</span>
    <Separator orientation="vertical" />
    <span className="text-sm text-foreground">Attendance</span>
    <Separator orientation="vertical" />
    <span className="text-sm text-foreground">Grades</span>
  </div>
)
```
