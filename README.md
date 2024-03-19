# Quantity Math for JavaScript/TypeScript

This is a library for dealing with numbers with units like "10 meters".

Based on [PQM](https://github.com/GhostWrench/pqm), with extensive changes.

MIT licensed.

## Features

- Zero dependencies.
- Only 4.5 KiB minified and gzipped.
- Basic math operations: multiply, add, subtract, etc.
- Supports tolerance values like "2±0.2 cm", and carries them through mathematical operations.
- "Remembers" the units you input and uses them by default for output.
- Metric prefixes for all SI units (e.g. km, MHz, μN)
- Binary prefixes for all information units (e.g. kib, kiB, MiB)
- Custom dimensions ("2 foo" times "6 bar" = "12 foo⋅bar") can be defined on the fly
- Temperature units: K (Kelvins), degC (Celcius measurement), deltaC (Celcius difference), degF (Fahrenheit measurement)
- Supports "%" (percent) as a unit (50% of 50% is 25%, not "0.25 % %"; 50% of 400g is 200g, not "20000 g %")
- Faster than any comparable libraries for its feature set (you can run [the benchmark](./tests/benchmark.bench.ts)
  yourself with `deno bench`):
  - Quantity conversions:
    - 1.1x faster than `PQM`
    - 1.6x faster than `mathjs`
    - 2.1x faster than `unitmath`
    - 3.0x faster than `js-quantities`
  - Custom dimensions
    - 1.2x faster than `mathjs`
    - 1.9x faster than `unitmath`
    - `PQM` and `js-quantities` don't support custom dimensions

## Missing Features

- Some mathematical operations (e.g. division, sqrt) are not implemented yet because I didn't need them yet - feel free
  to add them.
- Some units are not supported because I didn't need them yet - feel free to add them (e.g. radiation, luminosity, tsp,
  oz).
- Array/vector operations (do math with many similar unit values efficiently) are not supported.
- Handling of "significant figures" is only partially implemented and needs improvement.
- This library generally tries _not_ to support units that can be considered deprecated (like "bar", "dram", "furlong",
  "league", "poise", etc.) or that are ambiguous (like "ton", "gallon", etc.).

## Installation

- Deno: `deno add @bradenmacdonald/quantity-math-js`
- Deno (no install): `import { Quantity } from "jsr:@bradenmacdonald/quantity-math-js@1.2.0";`
- NPM: `npx jsr add @bradenmacdonald/quantity-math-js`
- Yarn: `yarn dlx jsr add @bradenmacdonald/quantity-math-js`
- pnpm: `pnpm dlx jsr add @bradenmacdonald/quantity-math-js`
- Bun: `bunx jsr add @bradenmacdonald/quantity-math-js`
- Browser:
  ```html
  <script type="module">
    import { Quantity } from "https://esm.sh/jsr/@bradenmacdonald/quantity-math-js@1.2.0";
    // Or:
    const { Quantity } = await import('https://esm.sh/jsr/@bradenmacdonald/quantity-math-js@1.2.0');
  </script>
  ```

## Basic Usage

Importing:

```ts
import { Q, Quantity } from "@bradenmacdonald/quantity-math-js";
```

Constructing a quantity value:

```ts
new Quantity(10, { units: "cm" });
// or
Q`10 cm`;
// or
Q("10 cm");
```

Adding two quantities:

```ts
const x = Q`5 m`;
const y = Q`20 cm`;
const z = x.add(y);
z.toString(); // "5.2 m"
```

Multiplying two quantities:

```ts
const x = Q`5 kg`;
const y = Q`2 m`;
const z = x.multiply(y);
z.toString(); // "10 kg⋅m"
```

Serialize to simple object, using same units:

```ts
const x = new Quantity(5, { units: "lb" });
x.get(); // { magnitude: 5, units: "lb" }
```

Convert a quantity to the specified units:

```ts
const x = Q`10 cm`;
x.convert("in").get(); // { magnitude: 3.9370078740157486, units: "in" }
x.convert("mm").toString(); // "100 mm"
```

Simplify units:

```ts
const x = new Quantity(5, { units: "kg^2⋅m^2⋅s^-4⋅A^-2" });
x.toSI().toString(); // "5 kg/F"
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

## Running tests

To run the tests, code formatter, linter, etc. you need to use [Deno](https://deno.com/). The commands are standard:

    deno lint
    deno fmt
    deno test
