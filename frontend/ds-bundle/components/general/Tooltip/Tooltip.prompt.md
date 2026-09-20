Tooltip from collegeerp-frontend. Use via `window.WorkVarUI.Tooltip` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Default

```jsx
() => (
  <div className="flex items-center gap-6 p-8">
    <Tooltip content="Export the current roster as CSV">
      <Button variant="outline" size="sm">Export</Button>
    </Tooltip>
    <Tooltip content="Archived students are hidden from search" side="bottom">
      <span className="text-sm text-muted-foreground underline decoration-dotted cursor-help">
        Why can't I see archived students?
      </span>
    </Tooltip>
  </div>
)
```
