# bidi-dir

**Resolve text direction by dominant script, not by the first character.**

Zero dependencies · ~140 lines · TypeScript · works in the browser, in Node, and in React Server Components

[فارسی ↓](#فارسی)

---

## The problem

HTML's `dir="auto"` resolves direction from the **first strong character** in a
string. That is the Unicode "first-strong" heuristic, and for bilingual text it
is wrong more often than it is right.

Here is a real sentence that shipped broken in production. It is Persian — a
grammar note about the English word *some* — and it opens with a Latin word:

```
some در سؤال و منفی به any تبدیل می‌شود
```

`dir="auto"` sees `s`, decides the whole line is left-to-right, and renders it
backwards: the trailing punctuation jumps to the wrong end and the clause order
visually inverts.

The same trap catches every interface that renders text it did not author:

- user-generated content and comments
- product names, brands and technical terms inside a sentence
- dictionary entries, machine translation, LLM output
- any database column that can hold either language

## The fix

Count instead of peeking. Whichever script carries more of the string wins; a
word borrowed from the other script stays embedded where it belongs.

```ts
import { dominantDir, firstStrongDir } from "bidi-dir";

const s = "some در سؤال و منفی به any تبدیل می‌شود";

firstStrongDir(s); // "ltr"  ← what the browser does
dominantDir(s); //    "rtl"  ← what actually carries the sentence
```

```tsx
<p dir={dominantDir(text)}>{text}</p>
```

That is the whole idea.

## Install

```bash
npm install bidi-dir
```

Or copy `src/index.ts` into your project — it is one file with no imports.

## API

### `dominantDir(text, fallback = "rtl"): "rtl" | "ltr"`

The direction that carries the text. Ties fall back to first-strong; a string
with no strong characters at all (digits, punctuation, emoji) falls back to
`fallback`.

```ts
dominantDir("The word کتاب means book"); // "ltr" — mostly Latin
dominantDir("واژه‌ی book یعنی کتاب"); //      "rtl" — mostly Persian
dominantDir("123 — 456"); //                  "rtl" — nothing strong, default
dominantDir("123 — 456", "ltr"); //           "ltr" — your default
```

### `dirFor(text, lang?, fallback = "rtl"): "rtl" | "ltr"`

When you know the language of the **data**, that wins. Otherwise it falls
through to `dominantDir`.

```ts
dirFor(text, "fa"); // "rtl" — matched on the primary subtag, so fa-IR works too
dirFor(text, "en"); // "ltr"
dirFor(text); //       decided by script
```

> Pass the language of the **content**, never of the interface. A `title_fa`
> column is Persian even while the surrounding UI is English.

Recognised RTL subtags: `ar`, `arc`, `ckb`, `dv`, `fa`, `he`, `ku`, `ps`, `sd`,
`syr`, `ug`, `ur`, `yi`.

### `isolate(text, dir?): string`

Wraps the string in Unicode isolate controls (`U+2066`–`U+2069`) for sinks that
render plain text and have no `dir` attribute to set — `title` and `aria-label`
attributes, Open Graph descriptions, push notifications, emails, CLI output.

```ts
isolate(userName, "rtl"); // pins the base direction
isolate(userName); //       isolates using first-strong — still stops it
//                          scrambling the text around it
```

`stripIsolates(text)` removes them again.

### Detection helpers

```ts
hasRtl(text); //         any strong RTL character present
hasLtr(text); //         any strong LTR character present
isMixed(text); //        both — precisely the strings dir="auto" gets wrong
firstStrongDir(text); // what the browser would decide, or null
```

## Notes on the implementation

- **Character classes are written as `\uXXXX` escapes on purpose.** Literal RTL
  or invisible characters inside source files are exactly the bug class this
  library exists to prevent; a range written literally is unreviewable in a
  diff.
- **Arabic-Indic digits count as RTL.** They live inside the Arabic block, and
  digits sitting inside an RTL run belong to the text around them.
- **Pure and side-effect free.** No DOM, no `Intl`, no locale database, no
  imports. Safe in a React Server Component, a service worker, or a build
  script.

## When *not* to use this

On editable fields. `<input dir="auto">` and `<textarea dir="auto">` are
correct: direction should follow what the user is typing, character by
character, and a count computed once cannot do that.

## Prior art

`dir="auto"` and `Intl.Locale.prototype.textInfo` both answer a different
question — the first from one character, the second from a locale rather than
from the string. This library answers "which script is actually carrying this
particular string".

## Who uses it

Built for and used in production by **[Avize](https://avize.app)**, a free
bilingual Persian–English learning platform: a 242,000-word dictionary, courses
from A1 to C1, and a story reader — every screen of which mixes Persian and
English in the same line.

## License

MIT

---

<div dir="rtl" lang="fa" markdown="1">

## فارسی

### مشکل

مرورگر برای تصمیم‌گیری درباره‌ی جهت متن، در حالت `dir="auto"` فقط به **اولین
حرف قوی** نگاه می‌کند. برای متن دوزبانه، این حدس بیشتر اوقات غلط است.

این جمله فارسی است — یک نکته‌ی گرامری درباره‌ی کلمه‌ی انگلیسی *some* — و
اتفاقاً با یک کلمه‌ی لاتین شروع شده:

```
some در سؤال و منفی به any تبدیل می‌شود
```

مرورگر حرف `s` را می‌بیند، کل خط را چپ‌به‌راست در نظر می‌گیرد و متن به هم
می‌ریزد.

همین دام سر راه هر رابطی است که متنی را نمایش می‌دهد که خودش ننوشته: نظر
کاربران، نام محصولات و برندها، اصطلاحات فنی، مدخل‌های دیکشنری، خروجی ترجمه‌ی
ماشینی، و هر ستون دیتابیس که می‌تواند هر دو زبان را نگه دارد.

### راه‌حل

به‌جای نگاه کردن به اولین حرف، حرف‌ها **شمرده** می‌شوند. هر خطی که بیشترِ متن را
حمل می‌کند برنده است، و کلمه‌ی قرض‌گرفته‌شده از خط دیگر، سرجای خودش باقی می‌ماند.

```ts
import { dominantDir } from "bidi-dir";

dominantDir("some در سؤال و منفی به any تبدیل می‌شود"); // "rtl"
dominantDir("The word کتاب means book"); //               "ltr"
```

```tsx
<p dir={dominantDir(text)}>{text}</p>
```

### نکته‌ی مهم

اگر زبان **داده** را می‌دانی، از `dirFor` استفاده کن و همان را بده — نه زبان
رابط کاربری. یک ستون `title_fa` فارسی است حتی وقتی رابط انگلیسی است.

```ts
dirFor(text, "fa"); // "rtl"
dirFor(text); //       بر اساس خط تصمیم می‌گیرد
```

### کجا استفاده نکن

روی فیلدهای قابل ویرایش. `<input dir="auto">` درست است — جهت باید حرف‌به‌حرف
همراه تایپ کاربر تغییر کند، و شمارشی که یک بار انجام شده این کار را نمی‌کند.

### ساخته‌شده برای

**[آویزه](https://avize.app)** — پلتفرم رایگان آموزش زبان انگلیسی برای
فارسی‌زبانان: واژه‌نامه‌ی ۲۴۲ هزار کلمه‌ای، دوره‌های A1 تا C1، و داستان‌خوان.
هر صفحه‌اش فارسی و انگلیسی را در یک خط کنار هم دارد.

</div>
