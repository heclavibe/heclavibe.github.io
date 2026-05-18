/*!
 * RagXControl.js v1.0.0
 * Fine-grained typographic rag control for the web
 * https://github.com/your-username/ragxcontrol
 * MIT License
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.RagXControl = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────────

  const BREAKPOINT_DEFAULTS = {
    mobile:  { maxWidth: 767  },
    tablet:  { maxWidth: 1023 },
    desktop: { maxWidth: Infinity }
  };

  const SHAPE_STRATEGIES = {
    natural:    null,         // browser default
    flat:       'flat',       // aim for uniform line lengths
    wave:       'wave',       // gentle sine-curve variance
    triangle:   'triangle',  // lines shorten toward bottom
    ramp:       'ramp',       // lines lengthen toward bottom
    staircase:  'staircase'  // stepped descending lengths
  };

  const ZWSP  = '\u200B'; // zero-width space (soft break point)
  const NBSP  = '\u00A0'; // non-breaking space
  const SHY   = '\u00AD'; // soft hyphen

  // ─── Manual break flag map ────────────────────────────────────────────────────
  // Maps single-letter shorthand used in data-b="m t d" to breakpoint names.
  // Usage in HTML:  <wbr data-b="m">   mobile only
  //                 <wbr data-b="m t"> mobile + tablet
  //                 <wbr data-b="d">   desktop only
  const BREAK_FLAGS = { m: 'mobile', t: 'tablet', d: 'desktop' };

  // ─── Defaults ─────────────────────────────────────────────────────────────────

  const DEFAULTS = {
    // Selector for elements to process (CSS selector string or HTMLElement/NodeList)
    selector: 'p',

    // Alignment: 'left' | 'right' | 'justify' | 'center'
    align: 'left',

    // Breakpoints with per-viewport options
    breakpoints: {
      mobile: {
        maxWidth: 767,
        maxCharsPerLine: 45,
        minCharsPerLine: 20
      },
      tablet: {
        maxWidth: 1023,
        maxCharsPerLine: 65,
        minCharsPerLine: 35
      },
      desktop: {
        maxWidth: Infinity,
        maxCharsPerLine: 80,
        minCharsPerLine: 45
      }
    },

    // Hyphenation settings
    hyphenation: {
      enabled: true,
      minWordLength: 6,      // minimum word length before hyphenating
      minCharsBeforeBreak: 3, // min chars to keep before hyphen
      minCharsAfterBreak: 3,  // min chars after hyphen
      language: 'en'         // language for hyphenation patterns
    },

    // Rag shape: 'natural' | 'flat' | 'wave' | 'triangle' | 'ramp' | 'staircase'
    shape: 'natural',

    // Shape intensity: 0.0 (subtle) to 1.0 (pronounced)
    shapeIntensity: 0.5,

    // Widow & orphan control
    widows: {
      enabled: true,
      minWords: 2  // minimum words on the last line
    },

    // Small words: prevent short words from starting a line alone
    smallWords: {
      enabled: true,
      maxLength: 3,  // words of this length or shorter get a preceding NBSP
      words: null    // custom word list (overrides maxLength if provided)
    },

    // Emphasis: prevent short emphasized phrases from breaking
    emphasis: {
      enabled: true,
      maxWords: 3
    },

    // Dashes: break before em/en dashes
    dashes: {
      enabled: true
    },

    // Prepositions: prevent prepositions from ending a line
    prepositions: {
      enabled: true,
      words: ['a','an','the','in','on','at','by','for','of','to','up','as',
              'is','it','or','and','but','nor','so','yet','both','either',
              'not','only','just','than','then','that','this','with']
    },

    // Observe DOM mutations and resize events to re-process
    observe: true,

    // Callback fired after processing
    onProcess: null
  };

  // ─── Simple English hyphenation patterns ──────────────────────────────────────
  // (Liang algorithm light — covers common English breaks)
  const EN_PATTERNS = [
    [/([bcdfghjklmnpqrstvwxyz])([aeiou])/gi, '$1\u00AD$2'],  // consonant + vowel
    [/([aeiou]{2,})([bcdfghjklmnpqrstvwxyz]{2,})/gi, '$1\u00AD$2'],
    [/([bcdfghjklmnpqrstvwxyz]{2,})([aeiou])/gi, (m,a,b) => {
      // keep one consonant with the next syllable
      return a.slice(0,-1) + SHY + a.slice(-1) + b;
    }],
    [/(tion|sion|ment|ness|less|ful|ous|ive|ing|ed|er|ly|ty|ry|cy|gy|ny|fy)$/gi,
      (m) => SHY + m]
  ];

  // ─── Utility helpers ──────────────────────────────────────────────────────────

  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  function getBreakpoint(breakpoints) {
    const w = window.innerWidth;
    const bp = breakpoints;
    if (w <= (bp.mobile ? bp.mobile.maxWidth : 767))  return { name: 'mobile',  ...bp.mobile };
    if (w <= (bp.tablet ? bp.tablet.maxWidth : 1023)) return { name: 'tablet',  ...bp.tablet };
    return { name: 'desktop', ...bp.desktop };
  }

  function getElements(selector) {
    if (typeof selector === 'string') {
      return Array.from(document.querySelectorAll(selector));
    }
    if (selector instanceof HTMLElement) return [selector];
    if (selector instanceof NodeList || Array.isArray(selector)) {
      return Array.from(selector);
    }
    return [];
  }

  // Strip previously-inserted RagXControl markup from text nodes
  function cleanElement(el) {
    // Unwrap all spans we injected
    el.querySelectorAll('[data-rm]').forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    // Remove ZWSP and SHY we inserted
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      node.textContent = node.textContent.replace(/[\u200B\u00AD]/g, '');
    }
  }

  // Wrap a text node substring in a span for styling/breaking
  function wrapRange(textNode, start, end, attrs) {
    const range = document.createRange();
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const span = document.createElement('span');
    span.setAttribute('data-rm', '1');
    Object.assign(span.style, attrs.style || {});
    if (attrs.class) span.className = attrs.class;
    range.surroundContents(span);
    return span;
  }

  // Insert ZWSP (soft break) before a position in a text node
  function insertBreakBefore(textNode, pos) {
    const text = textNode.textContent;
    textNode.textContent = text.slice(0, pos) + ZWSP + text.slice(pos);
  }

  // Insert SHY (soft hyphen) inside a word in a text node
  function insertShy(textNode, pos) {
    const text = textNode.textContent;
    textNode.textContent = text.slice(0, pos) + SHY + text.slice(pos);
  }

  // ─── Hyphenation ──────────────────────────────────────────────────────────────

  function hyphenateWord(word, opts) {
    const { minWordLength, minCharsBeforeBreak, minCharsAfterBreak } = opts;
    if (word.length < minWordLength) return word;

    let result = word;
    // Apply each pattern
    for (const [pattern, replacement] of EN_PATTERNS) {
      result = result.replace(pattern, replacement);
    }

    // Clean up: remove breaks that violate min char rules
    const parts = result.split(SHY);
    let rebuilt = '';
    let acc = '';
    for (let i = 0; i < parts.length; i++) {
      acc += parts[i];
      const remaining = parts.slice(i + 1).join('');
      if (i < parts.length - 1) {
        if (acc.length >= minCharsBeforeBreak && remaining.length >= minCharsAfterBreak) {
          rebuilt += acc + SHY;
          acc = '';
        } else {
          rebuilt += acc;
          acc = '';
        }
      } else {
        rebuilt += acc;
      }
    }
    return rebuilt;
  }

  function processHyphenation(el, opts) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Skip inside inline code, pre, etc.
        const p = node.parentElement;
        if (p && ['CODE','PRE','KBD','SAMP'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(n => {
      n.textContent = n.textContent.replace(/\b([a-zA-ZÀ-ÿ'-]{1,})\b/g, (word) => {
        return hyphenateWord(word, opts);
      });
    });
  }

  // ─── Small words / prepositions ───────────────────────────────────────────────

  function processSmallWords(el, opts) {
    if (!opts.enabled) return;
    const wordList = opts.words || null;
    const maxLen   = opts.maxLength || 3;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes  = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(n => {
      n.textContent = n.textContent.replace(/(\s)(\S+)/g, (match, space, word) => {
        const clean = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
        const isSmall = wordList
          ? wordList.includes(clean)
          : clean.length <= maxLen;
        if (isSmall) return NBSP + word;
        return match;
      });
    });
  }

  function processPrepositions(el, opts) {
    if (!opts.enabled) return;
    const words = opts.words;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes  = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(n => {
      n.textContent = n.textContent.replace(/\b(\w+)(\s+)/g, (match, word, space) => {
        const clean = word.toLowerCase();
        if (words.includes(clean)) return word + NBSP;
        return match;
      });
    });
  }

  function processDashes(el, opts) {
    if (!opts.enabled) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes  = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    // Insert ZWSP before em/en dashes so line can break there
    nodes.forEach(n => {
      n.textContent = n.textContent.replace(/([\u2013\u2014])/g, ZWSP + '$1');
    });
  }

  // ─── Widow control ────────────────────────────────────────────────────────────

  function processWidows(el, opts) {
    if (!opts.enabled) return;
    const minWords = opts.minWords || 2;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes  = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    // Work on last text node of element
    if (!nodes.length) return;
    const last = nodes[nodes.length - 1];
    const text = last.textContent.trimEnd();
    const words = text.split(/\s+/);
    if (words.length < minWords + 1) return; // too few words to worry about

    // Replace last N-1 spaces with NBSP to glue last `minWords` together
    let result = text;
    for (let i = 0; i < minWords - 1; i++) {
      const idx = result.lastIndexOf(' ');
      if (idx < 0) break;
      result = result.slice(0, idx) + NBSP + result.slice(idx + 1);
    }
    last.textContent = result;
  }

  // ─── Rag shape ────────────────────────────────────────────────────────────────

  // Shape processing works by measuring rendered lines after all other transforms
  // and then adjusting max-width of the container (or inserting <br>s at computed
  // positions) to achieve the desired silhouette.
  //
  // NOTE: This requires a layout read, so it runs after a rAF.

  function computeShapeWidths(lineCount, shape, intensity, containerWidth) {
    const lines = [];
    const mid = containerWidth;
    const variance = containerWidth * 0.20 * intensity;

    for (let i = 0; i < lineCount; i++) {
      const t = lineCount > 1 ? i / (lineCount - 1) : 0; // 0 → 1

      let width;
      switch (shape) {
        case 'flat':
          width = mid;
          break;
        case 'wave':
          width = mid - variance * Math.sin(t * Math.PI * 2);
          break;
        case 'triangle':
          width = mid * (1 - t * 0.4 * intensity);
          break;
        case 'ramp':
          width = mid * (0.6 + t * 0.4 * intensity);
          break;
        case 'staircase': {
          const steps = 4;
          const step  = Math.floor(t * steps) / steps;
          width = mid * (1 - step * 0.3 * intensity);
          break;
        }
        default:
          width = mid;
      }
      lines.push(Math.round(Math.max(width, containerWidth * 0.4)));
    }
    return lines;
  }

  // ─── Manual break processing ─────────────────────────────────────────────────

  // Activates <wbr data-b="m t d"> elements whose flags match the current
  // breakpoint. Inactive ones are set display:none so they have no effect.
  // Active ones become display:inline so the browser treats them as soft breaks.
  function processManualBreaks(el, bpName) {
    const wbrs = el.querySelectorAll('wbr[data-b]');
    wbrs.forEach(wbr => {
      const flags = (wbr.getAttribute('data-b') || '').trim().split(/\s+/);
      // Resolve each flag letter to a breakpoint name
      const bpNames = flags.map(f => BREAK_FLAGS[f]).filter(Boolean);
      if (bpNames.includes(bpName)) {
        // Active for this breakpoint — make it a real soft-break opportunity
        wbr.style.display = 'inline';
      } else {
        // Not active — hide so it has zero effect on layout
        wbr.style.display = 'none';
      }
    });
  }

  // ─── Core apply function ──────────────────────────────────────────────────────

  function applyToElement(el, opts, bp) {
    // 1. Clean any previous processing
    cleanElement(el);

    // 2. Set alignment
    if (opts.align) {
      el.style.textAlign = opts.align;
    }

    // CSS hyphenation — works in concert with our soft hyphens
    if (opts.hyphenation && opts.hyphenation.enabled) {
      el.style.hyphens         = 'auto';
      el.style.webkitHyphens   = 'auto';
      el.style.msHyphens       = 'auto';
      el.style.overflowWrap    = 'break-word';
      el.lang = opts.hyphenation.language || 'en';
      processHyphenation(el, opts.hyphenation);
    } else {
      el.style.hyphens = 'none';
    }

    // text-wrap: pretty for modern browsers
    el.style.textWrap = 'pretty';

    // 3. Prepositions
    if (opts.prepositions) processPrepositions(el, opts.prepositions);

    // 4. Small words
    if (opts.smallWords) processSmallWords(el, opts.smallWords);

    // 5. Dashes
    if (opts.dashes) processDashes(el, opts.dashes);

    // 6. Widows
    if (opts.widows) processWidows(el, opts.widows);

    // 7. Manual line breaks — activate/deactivate <wbr data-b="m t d"> per breakpoint
    if (bp && bp.name) processManualBreaks(el, bp.name);

    // 7. Max chars per line via max-ch
    if (bp && bp.maxCharsPerLine) {
      el.style.maxWidth = bp.maxCharsPerLine + 'ch';
    }

    // 8. Shape — deferred to next paint
    if (opts.shape && opts.shape !== 'natural') {
      requestAnimationFrame(() => applyShape(el, opts));
    }
  }

  function applyShape(el, opts) {
    const shape     = opts.shape;
    const intensity = opts.shapeIntensity != null ? opts.shapeIntensity : 0.5;

    // Measure the element's rendered line geometry using Range
    const containerWidth = el.getBoundingClientRect().width;
    if (!containerWidth) return;

    // Count approx lines via scrollHeight / line-height
    const style      = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;
    const lineCount  = Math.round(el.scrollHeight / lineHeight);
    if (lineCount < 2) return;

    const widths = computeShapeWidths(lineCount, shape, intensity, containerWidth);

    // We achieve shape by wrapping lines in spans with explicit max-width.
    // This is an approximation — we split into word-groups by injecting <wbr>s
    // and setting per-line constraints via a CSS custom property trick.
    // The cleanest cross-browser approach: rebuild content into line-spans.
    rebuildWithShape(el, widths, lineHeight, containerWidth);
  }

  function rebuildWithShape(el, targetWidths, lineHeight, containerWidth) {
    // Collect all text content
    const fullText = el.innerText || el.textContent;
    const words    = fullText.trim().split(/\s+/);

    // Clear and rebuild
    el.innerHTML = '';

    // Create a hidden canvas for text measurement
    const canvas  = document.createElement('canvas');
    const ctx     = canvas.getContext('2d');
    const style   = window.getComputedStyle(el);
    ctx.font      = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    let lineIndex = 0;
    let wordIndex = 0;

    while (wordIndex < words.length) {
      const maxW    = targetWidths[Math.min(lineIndex, targetWidths.length - 1)];
      const lineEl  = document.createElement('span');
      lineEl.setAttribute('data-rm', '1');
      lineEl.style.cssText = `display:block; max-width:${maxW}px;`;

      let lineText = '';
      while (wordIndex < words.length) {
        const test = lineText ? lineText + ' ' + words[wordIndex] : words[wordIndex];
        const w    = ctx.measureText(test).width;
        if (w > maxW && lineText) break; // wrap
        lineText   = test;
        wordIndex++;
      }

      lineEl.textContent = lineText;
      el.appendChild(lineEl);
      lineIndex++;
    }
  }

  // ─── RagXControl class ──────────────────────────────────────────────────────────

  class RagXControl {
    constructor(options) {
      this.opts       = deepMerge(DEFAULTS, options || {});
      this._elements  = [];
      this._observer  = null;
      this._resizeTimer = null;
      this._bound     = this._onResize.bind(this);

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    /**
     * Initialise: find elements, process, and set up observers.
     */
    init() {
      this._elements = getElements(this.opts.selector);
      this._process();
      if (this.opts.observe) {
        this._observe();
      }
      return this;
    }

    /**
     * Re-process all matched elements (e.g. after dynamic content update).
     */
    refresh() {
      this._elements = getElements(this.opts.selector);
      this._process();
      return this;
    }

    /**
     * Process a single element or selector.
     * @param {string|HTMLElement} target
     * @param {object} [overrides] - option overrides for this element only
     */
    processElement(target, overrides) {
      const opts = overrides ? deepMerge(this.opts, overrides) : this.opts;
      const els  = getElements(target);
      const bp   = getBreakpoint(opts.breakpoints);
      els.forEach(el => applyToElement(el, opts, bp));
      return this;
    }

    /**
     * Update options and re-process.
     * @param {object} newOptions
     */
    update(newOptions) {
      this.opts = deepMerge(this.opts, newOptions);
      this._process();
      return this;
    }

    /**
     * Set the rag shape.
     * @param {'natural'|'flat'|'wave'|'triangle'|'ramp'|'staircase'} shape
     * @param {number} [intensity=0.5]
     */
    setShape(shape, intensity) {
      this.opts.shape = shape;
      if (intensity != null) this.opts.shapeIntensity = intensity;
      this._process();
      return this;
    }

    /**
     * Set text alignment.
     * @param {'left'|'right'|'justify'|'center'} align
     */
    setAlign(align) {
      this.opts.align = align;
      this._process();
      return this;
    }

    /**
     * Enable/disable hyphenation.
     * @param {boolean} enabled
     * @param {object} [opts]
     */
    setHyphenation(enabled, opts) {
      this.opts.hyphenation = deepMerge(this.opts.hyphenation, { enabled, ...(opts || {}) });
      this._process();
      return this;
    }

    /**
     * Set breakpoint definitions.
     * @param {object} breakpoints
     */
    setBreakpoints(breakpoints) {
      this.opts.breakpoints = deepMerge(this.opts.breakpoints, breakpoints);
      this._process();
      return this;
    }

    /**
     * Clean all RagXControl modifications from elements.
     */
    destroy() {
      this._elements.forEach(cleanElement);
      if (this._observer) this._observer.disconnect();
      window.removeEventListener('resize', this._bound);
      return this;
    }

    // ── Private ─────────────────────────────────────────────────────────────────

    _process() {
      const bp = getBreakpoint(this.opts.breakpoints);
      this._elements.forEach(el => {
        applyToElement(el, this.opts, bp);
      });
      if (typeof this.opts.onProcess === 'function') {
        this.opts.onProcess({ elements: this._elements, breakpoint: bp.name });
      }
    }

    _onResize() {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this._process(), 150);
    }

    _observe() {
      // Resize
      window.addEventListener('resize', this._bound);

      // DOM mutations
      if (typeof MutationObserver !== 'undefined') {
        this._observer = new MutationObserver((mutations) => {
          const relevant = mutations.some(m =>
            m.type === 'childList' ||
            (m.type === 'characterData' && this._elements.includes(m.target.parentElement))
          );
          if (relevant) this._process();
        });
        const container = this.opts.observeRoot || document.body;
        this._observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }

  // ── Factory shorthand ─────────────────────────────────────────────────────────

  /**
   * Create a RagXControl instance.
   * @param {string|object} selectorOrOptions
   * @param {object} [options]
   */
  function ragxcontrol(selectorOrOptions, options) {
    if (typeof selectorOrOptions === 'string') {
      return new RagXControl({ selector: selectorOrOptions, ...options });
    }
    return new RagXControl(selectorOrOptions);
  }

  ragxcontrol.create  = (opts) => new RagXControl(opts);
  ragxcontrol.version = '1.0.0';

  // Expose shape names and breakpoint helpers
  ragxcontrol.SHAPES = Object.keys(SHAPE_STRATEGIES);

  return ragxcontrol;
}));
