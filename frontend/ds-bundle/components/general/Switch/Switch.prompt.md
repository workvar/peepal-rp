Switch from collegeerp-frontend. Use via `window.WorkVarUI.Switch` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### OnOff

```jsx
() => (
  <div className="flex items-center gap-6">
    <Switch checked={true} onCheckedChange={() => {}} />
    <Switch checked={false} onCheckedChange={() => {}} />
  </div>
)
```

### WithLabel

```jsx
() => (
  <div className="flex flex-col gap-3">
    <Switch checked={true} onCheckedChange={() => {}} label="Email notifications" />
    <Switch checked={false} onCheckedChange={() => {}} label="SMS alerts" labelPosition="left" />
    <Switch checked={true} onCheckedChange={() => {}} label="Auto-approve leave requests" disabled />
  </div>
)
```

### Sizes

```jsx
() => (
  <div className="flex items-center gap-6">
    <Switch checked={true} onCheckedChange={() => {}} size="sm" />
    <Switch checked={true} onCheckedChange={() => {}} size="md" />
  </div>
)
```
