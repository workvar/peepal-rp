Select from collegeerp-frontend. Use via `window.WorkVarUI.Select` (bundle loaded from the root `_ds_bundle.js`).

## Examples

### Placeholder

```jsx
() => (
  <div className="w-64">
    <Select>
      <SelectTrigger placeholder="Select department…" />
      <SelectContent>
        <SelectItem value="cs">Computer Science</SelectItem>
        <SelectItem value="ee">Electrical Engineering</SelectItem>
        <SelectItem value="me">Mechanical Engineering</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

// SelectItem only registers its human-readable label with the trigger while
// SelectContent is mounted (open) — which a static preview never triggers.
// A closed trigger with a set value therefore falls back to displaying the
// raw `value` string verbatim, so — deliberately, for this story only —
// `value` is written as the human-readable text itself rather than a short
// code, so the closed trigger shows real words instead of a raw key.
```

### WithValueAndGroups

```jsx
() => (
  <div className="w-64">
    <Select defaultValue="Computer Science">
      <SelectTrigger />
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Engineering</SelectLabel>
          <SelectItem value="Computer Science">Computer Science</SelectItem>
          <SelectItem value="Electrical Engineering">Electrical Engineering</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Sciences</SelectLabel>
          <SelectItem value="Physics">Physics</SelectItem>
          <SelectItem value="Chemistry">Chemistry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </div>
)
```

## Related

`SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectSeparator`, `SelectTrigger`, `SelectValue`
