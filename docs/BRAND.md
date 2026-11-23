# Brand

Colours come from the Glitch F logo (`src/PixelLogo.tsx`). Use only these four wherever the site needs colour.

| Token | Hex | Role |
|---|---|---|
| `--brand-red` | `#ff4b4b` | Main accent: highlights, links, primary emphasis |
| `--brand-cyan` | `#05dbe9` | Second accent: contrast, secondary emphasis |
| `--brand-white` | `#f6f4f2` | Text and light surfaces |
| `--brand-black` | `#252423` | Background (warm charcoal, not pure black) |

Defined in `src/styles.css` `:root`. Tints are fine (`color-mix(in srgb, var(--brand-red) 20%, transparent)`); new hues are not.

Legacy accent names (`--coral`, `--orange`, `--yellow`, `--pink` → red; `--lime`, `--turquoise`, `--sky`, `--king`, `--lavender` → cyan) are aliases kept so older code still works. New code should use the `--brand-*` names.

## Exceptions

- Tech-stack logos in the hero grid keep their own brand colours (PyTorch orange, Python blue, …).
- Project 3D scroll stories use the brand palette through `src/story/palette.ts` (`palette.brand`); warm hues map to red, cool hues to cyan.

## Type

- Body: Archivo (wide, `font-stretch` 112–125%)
- Code / labels: JetBrains Mono
- Handwritten (About section): Caveat
- Logo: 12×12 pixel "Glitch F", red + cyan channel split on white
