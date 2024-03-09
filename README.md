# Quantity Math for JavaScript/TypeScript

This is a library for dealing with numbers with units like "10 meters".

Based on [PQM](https://github.com/GhostWrench/pqm), with extensive changes.

MIT licensed.

Zero dependencies.

## Installation

- Deno: `deno add @bradenmacdonald/quantity-math-js`
- Deno (no install): `import { Quantity } from "jsr:@bradenmacdonald/quantity-math-js@1.0.1";`
- NPM: `npx jsr add @bradenmacdonald/quantity-math-js`
- Yarn: `yarn dlx jsr add @bradenmacdonald/quantity-math-js`
- pnpm: `pnpm dlx jsr add @bradenmacdonald/quantity-math-js`
- Bun: `bunx jsr add @bradenmacdonald/quantity-math-js`
- Browser:
  ```html
  <script type="module">
    import { Quantity } from "https://esm.sh/jsr/@bradenmacdonald/quantity-math-js@1.0.1";
    // Or:
    const { Quantity } = await import('https://esm.sh/jsr/@bradenmacdonald/quantity-math-js@1.0.1');
  </script>
  ```

## Basic Usage

Importing:

```ts
import { Quantity } from "@bradenmacdonald/quantity-math-js";
```

Constructing a quantity value:

```ts
new Quantity(10, { units: "cm" });
```

Adding two quantities:

```ts
const x = new Quantity(5, { units: "m" });
const y = new Quantity(20, { units: "cm" });
const z = x.add(y);
z.toString(); // "5.2 m"
```

Multiplying two quantities:

```ts
const x = new Quantity(5, { units: "kg" });
const y = new Quantity(2, { units: "m" });
const z = x.multiply(y);
z.toString(); // "10 kg⋅m"
```

Serialize to simple object, using same units:

```ts
const x = new Quantity(5, { units: "lb" });
x.get(); // { magnitude: 5, units: "lb" }
```

Serialize to simple object, using specified units:

```ts
const x = new Quantity(10, { units: "cm" });
x.getWithUnits("in"); // { magnitude: 3.9370078740157486, units: "in" }
```

Simplify units:

```ts
const x = new Quantity(5, { units: "kg^2⋅m^2⋅s^-4⋅A^-2" });
x.getSI(); // { magnitude: 5, units: "kg/F" }
```

## Syntactic Sugar

If you prefer, there is a much more compact way to initialize `Quantity` instances: using the `Q` template helper. This
is slightly less efficient, but far more readable and convenient in many cases.

```ts
import { Q } from "@bradenmacdonald/quantity-math-js";

const force = Q`34.2 kg m/s^2`; // Shorter version of: new Quantity(34.2, {units: "kg m/s^2"})
force.getSI(); // { magnitude: 34.2, units: "N" }
force.multiply(Q`2 s^2`).toString(); // "68.4 kg⋅m"
```

You can also call it as a function, which acts like "parse quantity string":

```ts
const force = Q("34.2 kg m/s^2"); // new Quantity(34.2, {units: "kg m/s^2"})
```

## Error/uncertainty/tolerance

You can specify a "plus/minus" value (in the same units). Operations like addition and multiplication will preserve the
plus/minus value, following the standard rules (i.e. addition adds the absolute uncertainty, multiplication adds the
relative uncertainty, etc.).

```ts
const x = new Quantity(4.52, { units: "cm", plusMinus: 0.02 }); // 4.52±0.02 cm
const y = Q`2±0.2 cm`; // Or use the Q string syntax
const z = x.multiply(y); // z = xy = 9.04 ± 0.944 cm²
z.get(); // { magnitude: 9.04, units: "cm^2", plusMinus: 0.944 }
z.toString(); // "9.0±0.9 cm^2" (toString() will automatically round the output)
```

## Custom units

Any unit name that starts with an underscore is considered to be a base custom unit (prefixed custom units are not
supported). So you can define and use arbitrary units on the fly:

```ts
const f = new Quantity(10, { units: "_foo" });
const b = new Quantity(2, { units: "_bar" });
const fb = f.multiply(b);
fb.toString(); // "20 _foo⋅_bar"
fb.multiply(f).toString(); // "200 _foo^2⋅_bar"
```

## Development Roadmap / TODOs

- Finish implementing "significant digits"
- Implement more mathematical operations like division and exponentiation.
- Add support for angular units, including converting radians to degrees and treating "angle" as a dimension, to avoid
  ambiguities with units like "rpm" and "Hz".
- Consider adding support for additional units (radiation, angles, more non-SI units).

## Non-features / Non-goals

This library generally tries _not_ to support units that can be considered deprecated (like "bar", "dram", "furlong",
"league", "poise", etc.) or that are ambiguous (like "ton", "gallon", etc.).

## Running tests

To run the tests, code formatter, linter, etc. you need to use [Deno](https://deno.com/). The commands are standard:

    deno lint
    deno fmt
    deno test
