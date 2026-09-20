Card from collegeerp-frontend. Use via `window.WorkVarUI.Card` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Default

```jsx
() => (
  <Card className="w-80">
    <CardHeader>
      <CardTitle>Student Enrollment</CardTitle>
      <CardDescription>Fall Term 2026 admissions summary</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold text-foreground">1,248</p>
      <p className="text-sm text-muted-foreground mt-1">+86 since last term</p>
    </CardContent>
    <CardFooter>
      <Button variant="outline" size="sm">View report</Button>
    </CardFooter>
  </Card>
)
```

### Raised

```jsx
() => (
  <Card variant="raised" className="w-80">
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>Fee Collection</CardTitle>
        <Badge variant="success" dot>On track</Badge>
      </div>
      <CardDescription>Term 2 · Due 12 Sep 2026</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-bold text-foreground">₹42.6L</p>
      <p className="text-sm text-muted-foreground mt-1">of ₹58L collected</p>
    </CardContent>
  </Card>
)
```

## Related

`CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`
