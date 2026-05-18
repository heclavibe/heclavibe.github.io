# RagXControl.js

> Fine-grained typographic rag control for the web — responsive, hyphenation-aware, shape-driven.

[![npm](https://img.shields.io/npm/v/ragxcontrol)](https://www.npmjs.com/package/ragxcontrol)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is "rag"?

In typography, **rag** refers to the uneven edge of a block of unjustified text — typically the right edge when text is left-aligned. A good rag flows in gentle, irregular steps. A bad rag creates distracting shapes: runts, rivers, widow lines, and awkward white-space pockets.

RagXControl gives you fine control over all of this in a responsive, modern JS library.

---

## Features

- **Responsive breakpoints** — configure different settings for mobile, tablet, and desktop
- **Max characters per line** (`ch` units) per viewport
- **Hyphenation** — automatic soft hyphen (`&shy;`) insertion for long words
- **Rag shape control** — `natural`, `flat`, `wave`, `triangle`, `ramp`, `staircase`
- **Text alignment** — left, right, justify, center
- **Small word prevention** — prevents short words from orphaning at line-start
- **Preposition control** — stops prepositions from ending a line
- **Widow & orphan control** — glues the last N words together
- **Dash-aware breaking** — prefers to break before em/en dashes
- **Auto-observe** — re-processes on resize and DOM mutations
- **Zero dependencies** — plain vanilla JS, ~7 KB minified
- **ESM + CJS + UMD** builds

---

## Installation

### Via npm

```bash
npm install ragxcontrol
```

### Via CDN

```html
<script src="https://cdn.jsdelivr.net/npm/ragxcontrol/ragxcontrol.min.js"></script>
```

### Direct download

Download `ragxcontrol.js` and include it in your project.

---

## Quick Start

```html
<p class="body-text">Your paragraph content here…</p>

<script src="ragxcontrol.js"></script>
<script>
  ragxcontrol('p.body-text');
</script>
```

That's it. RagXControl processes all matched paragraphs with sensible defaults.

---

## Usage

### Basic

```js
// Simplest — use all defaults on a selector
ragxcontrol('p');

// With some options
ragxcontrol('p.article-body', {
  align: 'left',
  hyphenation: { enabled: true },
  widows: { enabled: true, minWords: 2 }
});

// Object form
ragxcontrol({
  selector: '.prose p',
  align: 'justify',
  shape: 'wave',
  shapeIntensity: 0.6
});
```

### ESM import

```js
import ragxcontrol from './ragxcontrol.esm.js';

const rm = ragxcontrol('.article p', { shape: 'triangle' });
```

---

## API Reference

### `ragxcontrol(selectorOrOptions, [options])`

Creates and returns a **RagXControl instance**.

| Argument | Type | Description |
|---|---|---|
| `selectorOrOptions` | `string \| object` | A CSS selector string, or a full options object |
| `options` | `object` | Options (when first arg is a selector string) |

---

### Options

#### `selector` *(string | HTMLElement | NodeList)*
Default: `'p'`

CSS selector for elements to process, or a direct element/list reference.

```js
selector: '.prose p, .article li'
```

---

#### `align` *(string)*
Default: `'left'`

Text alignment. One of: `'left'` `'right'` `'justify'` `'center'`

```js
align: 'justify'
```

---

#### `breakpoints` *(object)*
Default:
```js
breakpoints: {
  mobile:  { maxWidth: 767,      maxCharsPerLine: 45, minCharsPerLine: 20 },
  tablet:  { maxWidth: 1023,     maxCharsPerLine: 65, minCharsPerLine: 35 },
  desktop: { maxWidth: Infinity, maxCharsPerLine: 80, minCharsPerLine: 45 }
}
```

Per-viewport settings. `maxCharsPerLine` is applied as a CSS `max-width` in `ch` units.  
Only the keys you define are overridden — unspecified keys inherit defaults.

```js
breakpoints: {
  mobile:  { maxCharsPerLine: 38 },
  tablet:  { maxCharsPerLine: 60 },
  desktop: { maxCharsPerLine: 72 }
}
```

---

#### `hyphenation` *(object)*

```js
hyphenation: {
  enabled: true,           // master switch
  minWordLength: 6,         // don't hyphenate words shorter than this
  minCharsBeforeBreak: 3,   // min chars to keep before the hyphen
  minCharsAfterBreak: 3,    // min chars after the hyphen
  language: 'en'            // used for CSS hyphens: auto
}
```

RagXControl inserts Unicode soft hyphens (`&shy;`) at computed break points and also sets `hyphens: auto` on the element so the browser's built-in hyphenator works in parallel.

---

#### `shape` *(string)*
Default: `'natural'`

The silhouette of the right rag edge. Choices:

| Value | Effect |
|---|---|
| `'natural'` | No shape enforcement — browser default |
| `'flat'` | All lines the same length |
| `'wave'` | Gentle sine-curve undulation |
| `'triangle'` | Lines shorten progressively (narrower at bottom) |
| `'ramp'` | Lines lengthen progressively (wider at bottom) |
| `'staircase'` | Stepped descending lengths |

```js
shape: 'wave',
shapeIntensity: 0.7
```

---

#### `shapeIntensity` *(number)*
Default: `0.5`

How pronounced the shape effect is. Range: `0.0` (very subtle) → `1.0` (maximum effect).

---

#### `widows` *(object)*

```js
widows: {
  enabled: true,
  minWords: 2   // how many words to glue at end of block
}
```

Prevents a single short word from being stranded on the last line by inserting non-breaking spaces between the final N words.

---

#### `smallWords` *(object)*

```js
smallWords: {
  enabled: true,
  maxLength: 3,  // treat words ≤ this length as "small"
  words: null    // provide a custom array of words to protect
}
```

Prevents short words (articles, conjunctions) from sitting alone at the start of a line by inserting a preceding `&nbsp;`.

```js
// Custom word list
smallWords: {
  enabled: true,
  words: ['a', 'an', 'the', 'in', 'of', 'to', 'by']
}
```

---

#### `prepositions` *(object)*

```js
prepositions: {
  enabled: true,
  words: ['a','an','the','in','on','at', /* … */]
}
```

Prevents prepositions from ending a line (they get a trailing `&nbsp;` so the next word wraps with them).

---

#### `dashes` *(object)*

```js
dashes: { enabled: true }
```

Inserts a zero-width space before em dashes (`—`) and en dashes (`–`) so the line prefers to break at the dash rather than mid-word.

---

#### `manualBreaks` *(object)*

```js
manualBreaks: { enabled: true }  // default: true
```

Processes `<wbr data-b="...">` elements in your HTML, activating or deactivating them based on the current breakpoint. This lets you place precise line-break hints directly in your markup.

**Shorthand flags** inside `data-b`:

| Flag | Breakpoint |
|------|-----------|
| `m`  | mobile    |
| `t`  | tablet    |
| `d`  | desktop   |

Space-separate multiple flags: `data-b="m t"` fires on both mobile and tablet.

```html
<p>
  Typography is the art of arranging type
  <wbr data-b="m">
  to make written language legible,
  <wbr data-b="m t">
  readable, and visually appealing
  <wbr data-b="m t d">
  when displayed across a wide range of devices.
</p>
```

- **mobile** — 3 breaks active (all three `<wbr>` elements)
- **tablet** — 2 breaks active (the `m t` and `m t d` ones)
- **desktop** — 1 break active (only `m t d`)

RagXControl sets active `<wbr>` elements to `display:inline` and inactive ones to `display:none`, so the browser only sees the breaks that apply to the current viewport.

---

#### `emphasis` *(object)*

```js
emphasis: {
  enabled: true,
  maxWords: 3   // don't break emphasized phrases shorter than this
}
```

---

#### `observe` *(boolean)*
Default: `true`

When `true`, RagXControl automatically re-processes elements on window resize (debounced 150ms) and DOM mutations (via `MutationObserver`).

---

#### `onProcess` *(function)*

Callback fired after each processing pass.

```js
onProcess: ({ elements, breakpoint }) => {
  console.log(`Processed ${elements.length} elements at ${breakpoint} breakpoint`);
}
```

---

### Instance Methods

All methods are chainable.

#### `.refresh()`
Re-queries the selector and re-processes all elements. Use after dynamic content insertion.

```js
const rm = ragxcontrol('.prose p');
// later…
fetchNewContent().then(() => rm.refresh());
```

---

#### `.update(options)`
Merges new options and re-processes.

```js
rm.update({ align: 'right', shape: 'ramp' });
```

---

#### `.processElement(target, [overrides])`
Process a single element (or selector) with optional option overrides.

```js
rm.processElement('#hero-text', { shape: 'wave', shapeIntensity: 0.8 });
```

---

#### `.setShape(shape, [intensity])`

```js
rm.setShape('triangle', 0.6);
```

---

#### `.setAlign(align)`

```js
rm.setAlign('justify');
```

---

#### `.setHyphenation(enabled, [options])`

```js
rm.setHyphenation(false);          // disable
rm.setHyphenation(true, { minWordLength: 8 });
```

---

#### `.setBreakpoints(breakpoints)`

```js
rm.setBreakpoints({
  mobile: { maxCharsPerLine: 35 }
});
```

---

#### `.destroy()`
Removes all RagXControl modifications and observers.

```js
rm.destroy();
```

---

## Examples

### Article prose

```js
ragxcontrol({
  selector: 'article p',
  align: 'left',
  breakpoints: {
    mobile:  { maxWidth: 767,  maxCharsPerLine: 42 },
    tablet:  { maxWidth: 1023, maxCharsPerLine: 62 },
    desktop: { maxWidth: Infinity, maxCharsPerLine: 75 }
  },
  hyphenation: { enabled: true, minWordLength: 7 },
  widows:       { enabled: true, minWords: 2 },
  smallWords:   { enabled: true },
  prepositions: { enabled: true },
  shape: 'natural'
});
```

---

### Justified magazine layout

```js
ragxcontrol({
  selector: '.magazine-col p',
  align: 'justify',
  hyphenation: {
    enabled: true,
    minWordLength: 5,
    minCharsBeforeBreak: 2,
    minCharsAfterBreak: 3
  },
  dashes:  { enabled: true },
  widows:  { enabled: true, minWords: 3 },
  shape:   'flat'
});
```

---

### Dynamic shape (wave)

```js
const rm = ragxcontrol({
  selector: '.feature-text',
  shape: 'wave',
  shapeIntensity: 0.55
});

// Reduce intensity on mobile
window.addEventListener('resize', () => {
  if (window.innerWidth < 768) {
    rm.update({ shapeIntensity: 0.25 });
  } else {
    rm.update({ shapeIntensity: 0.55 });
  }
});
```

---

### Process a single element with different settings

```js
const rm = ragxcontrol('.prose p');  // default processing for all paragraphs

// Override just the hero pull-quote
rm.processElement('#pull-quote', {
  align: 'right',
  shape: 'triangle',
  shapeIntensity: 0.7,
  hyphenation: { enabled: false },
  widows: { minWords: 3 }
});
```

---

### Staircase rag (decorative)

```js
ragxcontrol({
  selector: '.poem',
  shape: 'staircase',
  shapeIntensity: 0.9,
  align: 'left',
  hyphenation: { enabled: false },
  smallWords: { enabled: false },
  prepositions: { enabled: false }
});
```

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome 80+ | ✅ Full |
| Firefox 75+ | ✅ Full |
| Safari 13+ | ✅ Full |
| Edge 80+ | ✅ Full |
| IE 11 | ⚠️ Partial (no MutationObserver shape features) |

Shape features require `requestAnimationFrame` and `Canvas 2D` (for text measurement). All other features degrade gracefully.

---

## Typographic Background

The term **measure** in typography refers to the ideal line length. For body text, the classic guideline is **45–75 characters per line** (Robert Bringhurst, *The Elements of Typographic Style*). RagXControl's default breakpoint `maxCharsPerLine` values follow this principle: 45 on mobile, 65 on tablet, 80 on desktop.

A well-set rag avoids:
- **Runts** — a single word on the last line
- **Rivers** — vertical streaks of whitespace through justified text  
- **Bumps** — a line conspicuously shorter or longer than its neighbours
- **Orphans/widows** — isolated words or lines separated from their paragraph

---

## Contributing

Issues and PRs welcome at [github.com/your-username/ragxcontrol](https://github.com/your-username/ragxcontrol).

```bash
git clone https://github.com/your-username/ragxcontrol
cd ragxcontrol
npm install
npm run build   # produces ragxcontrol.min.js
npm test
```

---

## License

MIT © 2025
