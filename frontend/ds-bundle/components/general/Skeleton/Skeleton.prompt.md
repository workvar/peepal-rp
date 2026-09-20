Skeleton from collegeerp-frontend. Use via `window.WorkVarUI.Skeleton` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### TextLines

```jsx
() => (
  <div className="w-64 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-1/2" />
  </div>
)
```

### CardLoading

```jsx
() => (
  <div className="w-72 rounded-xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="h-24 w-full" />
  </div>
)
```
