Label from collegeerp-frontend. Use via `window.WorkVarUI.Label` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Default

```jsx
() => (
  <div className="w-72 space-y-1.5">
    <Label htmlFor="student-name">Student name</Label>
    <Input id="student-name" placeholder="Full legal name" />
  </div>
)
```

### Standalone

```jsx
() => (
  <div className="flex flex-wrap gap-4">
    <Label>Roll Number</Label>
    <Label>Date of Birth</Label>
    <Label>Guardian Contact</Label>
  </div>
)
```
