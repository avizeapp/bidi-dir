/**
 * Direction decisions for text you did not write.
 *
 * The browser's own heuristic — `dir="auto"` — looks at the FIRST strong
 * character only. A Persian sentence that happens to open with a Latin word
 * gets an LTR base direction and falls apart on screen. Any interface that
 * renders bilingual content it did not author (user input, product names,
 * technical terms, machine translation) hits this.
 *
 * `dominantDir` decides by counting instead: the script that carries the
 * sentence wins, and an embedded word from the other script stays embedded.
 * Ties fall back to the first strong character, which is the only signal left
 * at that point.
 *
 * Everything here is pure and dependency-free — safe in a browser, in Node, in
 * a React Server Component, in a build script. Character classes are written
 * as \uXXXX escapes on purpose: literal RTL or invisible characters in source
 * are exactly the bug class this module exists to prevent.
 */

export type Dir = "rtl" | "ltr";

// The RTL scripts: Hebrew, Arabic (with supplement and extended-A), Syriac,
// Thaana, and the Arabic presentation forms. The Arabic-Indic digit blocks
// live inside these ranges and vote RTL — digits inside an RTL run belong to
// the RTL text around them, so that bias is the correct one.
const RTL_RANGE =
  "\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC";

// Strong LTR: Latin plus its supplements and extensions.
const LTR_RANGE = "A-Za-z\u00C0-\u024F\u1E00-\u1EFF";

const RTL_CHAR = new RegExp(`[${RTL_RANGE}]`);
const LTR_CHAR = new RegExp(`[${LTR_RANGE}]`);
const RTL_ALL = new RegExp(`[${RTL_RANGE}]`, "g");
const LTR_ALL = new RegExp(`[${LTR_RANGE}]`, "g");
const FIRST_STRONG = new RegExp(`([${RTL_RANGE}])|([${LTR_RANGE}])`);

/** Unicode isolate controls, for plain-text sinks that have no DOM. */
export const LRI = "\u2066";
export const RLI = "\u2067";
export const FSI = "\u2068";
export const PDI = "\u2069";

/** Language subtags written right-to-left. Matched on the primary subtag, so
 *  `fa-IR` and `ar-EG` resolve the same as `fa` and `ar`. */
const RTL_LANGS = new Set([
  "ar", // Arabic
  "arc", // Aramaic
  "ckb", // Central Kurdish
  "dv", // Divehi
  "fa", // Persian
  "he", // Hebrew
  "ku", // Kurdish
  "ps", // Pashto
  "sd", // Sindhi
  "syr", // Syriac
  "ug", // Uyghur
  "ur", // Urdu
  "yi", // Yiddish
]);

/** True when the string contains at least one strong right-to-left character. */
export function hasRtl(text: string): boolean {
  return RTL_CHAR.test(text);
}

/** True when the string contains at least one strong left-to-right character. */
export function hasLtr(text: string): boolean {
  return LTR_CHAR.test(text);
}

/** Both scripts present — precisely the strings `dir="auto"` gets wrong. */
export function isMixed(text: string): boolean {
  return hasRtl(text) && hasLtr(text);
}

/**
 * What the browser's first-strong heuristic would decide, exposed so you can
 * compare it against `dominantDir` — and so tests can pin the difference.
 * Returns null when the string has no strong character at all.
 */
export function firstStrongDir(text: string): Dir | null {
  const m = FIRST_STRONG.exec(text);
  if (!m) return null;
  return m[1] ? "rtl" : "ltr";
}

/**
 * The direction that carries the text: whichever script has more strong
 * characters. A tie — rare, and usually a short bilingual label — falls back
 * to first-strong; no strong characters at all falls back to `fallback`.
 */
export function dominantDir(text: string, fallback: Dir = "rtl"): Dir {
  const rtl = (text.match(RTL_ALL) ?? []).length;
  const ltr = (text.match(LTR_ALL) ?? []).length;
  if (rtl > ltr) return "rtl";
  if (ltr > rtl) return "ltr";
  return firstStrongDir(text) ?? fallback;
}

/**
 * Direction for a string whose language may be known.
 *
 * When you know the language of the DATA, that wins — a `title_fa` column is
 * Persian even when the surrounding UI is English. Pass the language of the
 * content, never the language of the interface. With no language, the dominant
 * script decides.
 */
export function dirFor(text: string, lang?: string | null, fallback: Dir = "rtl"): Dir {
  if (lang) {
    const primary = lang.toLowerCase().split(/[-_]/)[0];
    if (RTL_LANGS.has(primary)) return "rtl";
    // A known language that is not in the RTL set is left-to-right. Callers who
    // want "unknown language" behaviour should pass null rather than a guess.
    if (/^[a-z]{2,3}$/.test(primary)) return "ltr";
  }
  return dominantDir(text, fallback);
}

/**
 * Wrap text in Unicode isolates, for places that render plain text rather than
 * DOM: title and aria attributes, Open Graph descriptions, push notifications,
 * emails, terminal output.
 *
 * With an explicit direction it pins the base direction. Without one it
 * isolates using first-strong — already an improvement, because the string can
 * no longer scramble the text around it.
 */
export function isolate(text: string, dir?: Dir): string {
  const open = dir === "rtl" ? RLI : dir === "ltr" ? LRI : FSI;
  return `${open}${text}${PDI}`;
}

/** Remove the isolate characters this module adds — for tests and round-trips. */
export function stripIsolates(text: string): string {
  return text.replace(/[\u2066-\u2069]/g, "");
}
