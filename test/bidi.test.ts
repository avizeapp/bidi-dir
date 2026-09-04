import { describe, expect, it } from "vitest";
import {
  dirFor,
  dominantDir,
  firstStrongDir,
  hasLtr,
  hasRtl,
  isMixed,
  isolate,
  stripIsolates,
} from "../src/index";

/**
 * The sentence at the centre of this library.
 *
 * "some در سؤال و منفی به any تبدیل می‌شود" is Persian — a grammar note about
 * the English word *some*. It opens with a Latin word, so `dir="auto"`
 * resolves it left-to-right and the rendered line falls apart. This exact
 * string shipped broken in production, which is why the library exists.
 */
const TRAP = "some در سؤال و منفی به any تبدیل می‌شود";
const PERSIAN = "فارسی برای یک کلمه دارد";
const ARABIC = "مرحبا بالعالم";
const HEBREW = "שלום עולם";
const BOOK_FA = "کتاب";

describe("dominantDir", () => {
  it("resolves the trap sentence to rtl where first-strong says ltr", () => {
    expect(firstStrongDir(TRAP)).toBe("ltr"); // what the browser does
    expect(dominantDir(TRAP)).toBe("rtl"); // what actually carries it
  });

  it("keeps genuinely English text ltr, embedded RTL included", () => {
    expect(dominantDir(`The word ${BOOK_FA} means book`)).toBe("ltr");
    expect(dominantDir("I have some friends.")).toBe("ltr");
  });

  it("keeps genuinely RTL text rtl", () => {
    expect(dominantDir(PERSIAN)).toBe("rtl");
    expect(dominantDir(ARABIC)).toBe("rtl");
    expect(dominantDir(HEBREW)).toBe("rtl");
  });

  it("falls back when nothing strong is present", () => {
    expect(dominantDir("123 — 456")).toBe("rtl"); // default fallback
    expect(dominantDir("123", "ltr")).toBe("ltr");
    expect(dominantDir("")).toBe("rtl");
  });

  it("breaks an exact tie with first-strong", () => {
    // Two strong characters each way: the opener decides.
    expect(dominantDir(`ab ${BOOK_FA.slice(0, 2)}`)).toBe("ltr");
  });
});

describe("dirFor", () => {
  it("lets a known content language win over the count", () => {
    expect(dirFor(TRAP, "fa")).toBe("rtl");
    expect(dirFor(`some ${BOOK_FA}`, "en")).toBe("ltr");
  });

  it("matches on the primary subtag", () => {
    expect(dirFor("whatever", "fa-IR")).toBe("rtl");
    expect(dirFor("whatever", "ar_EG")).toBe("rtl");
    expect(dirFor("whatever", "en-GB")).toBe("ltr");
  });

  it("falls through to the script when the language is unknown or absent", () => {
    expect(dirFor(TRAP)).toBe("rtl");
    expect(dirFor(TRAP, null)).toBe("rtl");
    expect(dirFor("The word means book", "")).toBe("ltr");
  });
});

describe("detection helpers", () => {
  it("reports the scripts present", () => {
    expect(hasRtl(TRAP)).toBe(true);
    expect(hasLtr(TRAP)).toBe(true);
    expect(hasRtl("hello")).toBe(false);
    expect(hasLtr(PERSIAN)).toBe(false);
  });

  it("detects mixed-script strings", () => {
    expect(isMixed(TRAP)).toBe(true);
    expect(isMixed("hello world")).toBe(false);
    expect(isMixed(PERSIAN)).toBe(false);
  });

  it("returns null from firstStrongDir when there is no strong character", () => {
    expect(firstStrongDir("123 !!")).toBeNull();
  });
});

describe("isolate", () => {
  it("round-trips through stripIsolates", () => {
    const wrapped = isolate(TRAP, "rtl");
    expect(wrapped).not.toBe(TRAP);
    expect(stripIsolates(wrapped)).toBe(TRAP);
  });

  it("pins the base direction when given one", () => {
    expect(isolate("x", "rtl").codePointAt(0)).toBe(0x2067); // RLI
    expect(isolate("x", "ltr").codePointAt(0)).toBe(0x2066); // LRI
    expect(isolate("x").codePointAt(0)).toBe(0x2068); // FSI
  });

  it("always closes with PDI", () => {
    const w = isolate("x", "rtl");
    expect(w.codePointAt(w.length - 1)).toBe(0x2069);
  });
});
