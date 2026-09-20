Dialog from collegeerp-frontend. Use via `window.WorkVarUI.Dialog` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Confirm

```jsx
() => (
  <CardHeight>
    <Dialog open onOpenChange={() => {}}>
      <DialogContent size="sm" onClose={() => {}} accent="red">
        <DialogHeader>
          <DialogTitle>Remove student?</DialogTitle>
          <DialogDescription>
            This unenrolls Ananya Sharma from Fall Term 2026. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">Cancel</Button>
          <Button variant="destructive">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardHeight>
)
```

### Form

```jsx
() => (
  <CardHeight>
    <Dialog open onOpenChange={() => {}}>
      <DialogContent size="md" onClose={() => {}} accent="violet">
        <DialogHeader>
          <DialogTitle>New admission</DialogTitle>
          <DialogDescription>Add a student to the current academic term.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <DialogGrid cols={2}>
            <DialogField label="Full name" required>
              <Input placeholder="Ananya Sharma" />
            </DialogField>
            <DialogField label="Roll number" required>
              <Input placeholder="24CS1042" />
            </DialogField>
            <DialogField label="Email" error="Enter a valid email address">
              <Input placeholder="student@collerp.edu" />
            </DialogField>
            <DialogField label="Guardian contact">
              <Input placeholder="+91 98765 43210" />
            </DialogField>
          </DialogGrid>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary">Cancel</Button>
          <Button>Save admission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </CardHeight>
)
```

## Related

`DialogBody`, `DialogContent`, `DialogDescription`, `DialogDivider`, `DialogField`, `DialogFooter`, `DialogGrid`, `DialogHeader`, `DialogOverlay`, `DialogSection`, `DialogTitle`
