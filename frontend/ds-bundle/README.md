# WorkVarUI (collegeerp-frontend@0.1.0)

This design system is the published collegeerp-frontend React library, bundled as a single
browser global. All 34 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.WorkVarUI`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.WorkVarUI.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { Badge } = window.WorkVarUI;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<Badge />);
```

## Tokens

91 CSS custom properties from collegeerp-frontend. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **color** (20): `--tw-border-spacing-x`, `--tw-border-spacing-y`, `--tw-ring-offset-color`, …
- **spacing** (2): `--tw-ring-inset`, `--tw-space-y-reverse`
- **radius** (1): `--radius`
- **shadow** (4): `--tw-ring-offset-shadow`, `--tw-ring-shadow`, `--tw-shadow`, …
- **other** (64): `--tw-translate-x`, `--tw-translate-y`, `--tw-rotate`, …

## Components

### general
- `Badge`
- `Button`
- `Card`
- `CardContent`
- `CardDescription`
- `CardFooter`
- `CardHeader`
- `CardTitle`
- `Dialog`
- `DialogBody`
- `DialogContent`
- `DialogDescription`
- `DialogDivider`
- `DialogField`
- `DialogFooter`
- `DialogGrid`
- `DialogHeader`
- `DialogOverlay`
- `DialogSection`
- `DialogTitle`
- `Input`
- `Label`
- `Select`
- `SelectContent`
- `SelectGroup`
- `SelectItem`
- `SelectLabel`
- `SelectSeparator`
- `SelectTrigger`
- `SelectValue`
- `Separator`
- `Skeleton`
- `Switch`
- `Tooltip`
