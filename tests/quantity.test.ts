import { assert, assertEquals, assertFalse, assertNotEquals, assertThrows } from "@std/assert";
import { Dimensions, Quantity, QuantityError } from "../mod.ts";

const ONE_MASS_DIMENSION = new Dimensions([1, 0, 0, 0, 0, 0, 0, 0, 0]);
const ONE_LENGTH_DIMENSION = new Dimensions([0, 1, 0, 0, 0, 0, 0, 0, 0]);
const ONE_TEMP_DIMENSION = new Dimensions([0, 0, 0, 1, 0, 0, 0, 0, 0]);
const TWO_LENGTH_DIMENSIONS = new Dimensions([0, 2, 0, 0, 0, 0, 0, 0, 0]);
const THREE_LENGTH_DIMENSIONS = new Dimensions([0, 3, 0, 0, 0, 0, 0, 0, 0]);
/** Force is mass*length/time^2 */
const FORCE_DIMENSIONS = new Dimensions([1, 1, -2, 0, 0, 0, 0, 0, 0]);

Deno.test("Quantity instance equality", async (t) => {
    /**
     * Equality test helper.
     * Given two functions that create Quantities, make sure that the Quantities
     * generated by the first function are equal to themselves, but not equal to
     * the Quantity generated by the second.
     */
    const check = (
        description: string,
        factory: () => Quantity,
        other: () => Quantity,
    ) => {
        const q1a = factory();
        const q1b = factory();
        const q2 = other();
        return t.step(description, () => {
            assert(q1a.equals(q1b));
            assertFalse(q1a.equals(q2));
            assertFalse(q2.equals(q1b));
            // Also check that the built-in deep equals agrees:
            assertEquals(q1a, q1b);
            assertNotEquals(q1a, q2);
        });
    };

    // The first number should equal itself but not equal the second:
    await check(
        "dimensionless number",
        () => new Quantity(15),
        () => new Quantity(12),
    );
    await check(
        "negative dim'less number",
        () => new Quantity(-50),
        () => new Quantity(12),
    );
    await check(
        "Zero",
        () => new Quantity(0),
        () => new Quantity(1),
    );
    await check(
        "Different dimensions, same magnitude",
        // This one will equal itself:
        () => new Quantity(15, { dimensions: new Dimensions([1, 0, 0, 0, 0, 0, 0, 0, 0]) }),
        // But the one above won't equal this one, with different dimensions:
        () => new Quantity(15, { dimensions: new Dimensions([0, 1, 0, 0, 0, 0, 0, 0, 0]) }),
    );
    await check(
        "Different dimensions, same magnitude (2)",
        () => new Quantity(0, { dimensions: new Dimensions([1, 0, 0, 0, 0, 0, 0, 0, 0]) }),
        () => new Quantity(0, { dimensions: new Dimensions([0, 0, 0, 0, 0, 0, 0, 0, 0]) }),
    );
    await check(
        "Different dimensions, same magnitude (3)",
        () => new Quantity(-10, { dimensions: new Dimensions([1, 0, 0, 1, 2, 0, 0, 0, 0]) }),
        () => new Quantity(-10, { dimensions: new Dimensions([1, 0, 0, 1, 1, 0, 0, 0, 0]) }),
    );
    await check(
        "Different custom dimensions, same magnitude and regular dimensions",
        () =>
            new Quantity(-10, {
                // deno-fmt-ignore
                dimensions: new Dimensions([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1], ["a", "b", "c", "d"]),
            }),
        () =>
            new Quantity(-10, {
                dimensions: new Dimensions(
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    ["a", "b", "c", "d"],
                ),
            }),
    );
    await check(
        "Different custom dimension names, same magnitude and dimension values",
        () =>
            new Quantity(-10, {
                dimensions: new Dimensions(
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2],
                    ["a", "b", "c", "d"],
                ),
            }),
        () =>
            new Quantity(-10, {
                dimensions: new Dimensions(
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2],
                    ["a", "b", "c", "elf"],
                ),
            }),
    );
});

Deno.test("Constructing Quantity instances with units", async (t) => {
    await t.step(`new Quantity(15, {units: "m"})`, () => {
        const q = new Quantity(15, { units: "m" });
        assertEquals(q.magnitude, 15);
        assertEquals(q.dimensions, ONE_LENGTH_DIMENSION);
    });

    await t.step(`new Quantity(15, {units: "km"})`, () => {
        const q = new Quantity(15, { units: "km" });
        assertEquals(q.magnitude, 15000);
        assertEquals(q.dimensions, ONE_LENGTH_DIMENSION);
    });

    await t.step(`new Quantity(3, {units: "km^2"})`, () => {
        const q = new Quantity(3, { units: "km^2" });
        // 3 km^2 is 3e6 m^2:
        assertEquals(q.magnitude, 3_000_000);
        assertEquals(q.dimensions, TWO_LENGTH_DIMENSIONS);
    });

    await t.step(`new Quantity(400, {units: "mm^3"})`, () => {
        const q = new Quantity(400, { units: "mm^3" });
        // 400 cubic milimeters is 4e-7 cubic meters.
        // But if we write 400e-7 we get a tiny error due to binary vs. decimal math,
        // so we have to write it as 400 * 1e-9, which is how this gets computed.
        assertEquals(q.magnitude, 400 * 1e-9);
        assertEquals(q.dimensions, THREE_LENGTH_DIMENSIONS);
    });

    await t.step(`new Quantity(12, {units: "kg⋅m/s^2"})`, () => {
        const q = new Quantity(12, { units: "kg⋅m/s^2" });
        assertEquals(q.magnitude, 12);
        assertEquals(q.dimensions, FORCE_DIMENSIONS);
    });

    await t.step(`new Quantity(20, {units: "degC"})`, () => {
        const q = new Quantity(20, { units: "degC" });
        assertEquals(q.magnitude, 293.15);
        assertEquals(q.dimensions, ONE_TEMP_DIMENSION);
    });
});

Deno.test("Sorting/comparing quantities", () => {
    const list = [
        new Quantity(2, { units: "km" }),
        new Quantity(1, { units: "cm" }),
        new Quantity(5, { units: "cm" }),
        new Quantity(1, { units: "in" }),
        new Quantity(20, { units: "mm" }),
        new Quantity(-2, { units: "m" }),
    ];
    list.sort(Quantity.compare);
    assertEquals(list, [
        new Quantity(-2, { units: "m" }),
        new Quantity(1, { units: "cm" }),
        new Quantity(20, { units: "mm" }),
        new Quantity(1, { units: "in" }),
        new Quantity(5, { units: "cm" }),
        new Quantity(2, { units: "km" }),
    ]);
});

Deno.test("equalsApprox", async (t) => {
    const compareApprox = (q1: Quantity, q2: Quantity, result: boolean) => {
        return t.step(`${q1.toString()} approx equals ${q2.toString()}: should be ${result}`, () => {
            assertEquals(q1.equalsApprox(q2), result);
        });
    };

    // Same magnitude but different units are never equal:
    const mag = 10;
    await compareApprox(new Quantity(mag, { units: "W" }), new Quantity(mag, { units: "m" }), false);
    await compareApprox(new Quantity(mag, { units: "kg" }), new Quantity(mag, { units: "lb" }), false);

    // Comparison with plusMinus values:
    await compareApprox(
        new Quantity(10, { units: "W", plusMinus: 0.1 }),
        new Quantity(10.09, { units: "W" }),
        true, // 10.09 falls within [10 - 0.1, 10 + 0.1]
    );
    await compareApprox(
        new Quantity(10, { units: "W", plusMinus: 0.1 }),
        new Quantity(10.11, { units: "W" }),
        false, // 10.11 does not fall within [10 - 0.1, 10 + 0.1]
    );
    await compareApprox(
        new Quantity(10, { units: "W", plusMinus: 1 }),
        new Quantity(11, { units: "W" }),
        true, // 11 falls within [10 - 1, 10 + 1]
    );
    await compareApprox(
        new Quantity(10, { units: "W", plusMinus: 1 }),
        new Quantity(9, { units: "W" }),
        true, // 9 falls within [10 - 1, 10 + 1]
    );
    await compareApprox(
        new Quantity(10, { units: "W", plusMinus: 1 }),
        new Quantity(8.5, { units: "W" }),
        false, // 8.5 does not fall within [10 - 1, 10 + 1]
    );
    await compareApprox(
        new Quantity(0.003, { units: "mg", plusMinus: 0.0005 }),
        new Quantity(0.0034, { units: "mg" }),
        true,
    );

    // Comparison with the default relative tolerance of 0.01%:
    const u = { units: "m" };
    // Comparing 10m with some other similar values:
    await compareApprox(new Quantity(10, u), new Quantity(10, u), true);
    await compareApprox(new Quantity(10, u), new Quantity(10.0000001, u), true);
    await compareApprox(new Quantity(10, u), new Quantity(10.001, u), true);
    await compareApprox(new Quantity(10, u), new Quantity(10.005, u), false);
    await compareApprox(new Quantity(10, u), new Quantity(9.995, u), false);
    await compareApprox(new Quantity(10, u), new Quantity(8, u), false);
    // Comparing 0.010m with some other similar values:
    await compareApprox(new Quantity(0.010, u), new Quantity(0.010, u), true);
    await compareApprox(new Quantity(0.010, u), new Quantity(0.010001, u), true);
    await compareApprox(new Quantity(0.010, u), new Quantity(0.0099995, u), true);
    await compareApprox(new Quantity(0.010, u), new Quantity(0.010002, u), false);
    await compareApprox(new Quantity(0.010, u), new Quantity(0.009998, u), false);
});

Deno.test("Adding quantities", async (t) => {
    await t.step(`cannot add units of different dimensions`, () => {
        const x = new Quantity(5, { units: "m" });
        const y = new Quantity(3);
        assertThrows(
            () => {
                x.add(y);
            },
            QuantityError,
            `Cannot add quanitites with different units.`,
        );
    });
    await t.step(`cannot add units of different dimensions (2)`, () => {
        const x = new Quantity(5, { units: "m" });
        const y = new Quantity(3, { units: "m^2" });
        assertThrows(
            () => {
                x.add(y);
            },
            QuantityError,
            `Cannot add quanitites with different units.`,
        );
    });
    await t.step(`cannot add units of different dimensions (3)`, () => {
        const x = new Quantity(5, { units: "m" });
        const y = new Quantity(3, { units: "g" });
        assertThrows(
            () => {
                x.add(y);
            },
            QuantityError,
            `Cannot add quanitites with different units.`,
        );
    });
    await t.step(`(25 g) + (17 g)`, () => {
        const x = new Quantity(25, { units: "g" });
        const y = new Quantity(17, { units: "g" });
        const z = x.add(y);
        assertEquals(z.magnitude, 0.042);
        assertEquals(z.dimensions, ONE_MASS_DIMENSION);
        assertEquals(z, y.add(x));
    });
    await t.step(`(5 kg) + (500 g)`, () => {
        const x = new Quantity(5, { units: "kg" });
        const y = new Quantity(500, { units: "g" });
        const z = x.add(y);
        assertEquals(z.magnitude, 5.5);
        assertEquals(z.dimensions, ONE_MASS_DIMENSION);
        assertEquals(z.toString(), "5.5 kg");
    });
    await t.step(`(500 g) + (5 kg)`, () => {
        const x = new Quantity(500, { units: "g" });
        const y = new Quantity(5, { units: "kg" });
        const z = x.add(y);
        assertEquals(z.magnitude, 5.5);
        assertEquals(z.dimensions, ONE_MASS_DIMENSION);
        assertEquals(z.toString(), "5500 g");
    });
    await t.step(`(5 kg) + (-500 g)`, () => {
        const x = new Quantity(5, { units: "kg" });
        const y = new Quantity(-500, { units: "g" });
        const z = x.add(y);
        assertEquals(z.magnitude, 4.5);
        assertEquals(z.dimensions, ONE_MASS_DIMENSION);
    });

    // Adding temperatures:
    await t.step(`temperatures in Kelvin add normally: (100 K) + (25 K) = (125 K)`, () => {
        const x = new Quantity(100, { units: "K" });
        const y = new Quantity(25, { units: "K" });
        const z = x.add(y);
        assertEquals(z.magnitude, 125);
        assertEquals(z.dimensions, ONE_TEMP_DIMENSION);
        assertEquals(z, y.add(x));
    });
    await t.step(`an exact temperature in °C can have a ΔC added to it.`, () => {
        const x = new Quantity(100, { units: "degC" });
        const y = new Quantity(25, { units: "deltaC" });
        const z = x.add(y);
        assertEquals(z.magnitude, 273.15 + 125); // in K
        assertEquals(z.dimensions, ONE_TEMP_DIMENSION);
    });
});

Deno.test("Multiplying quantities", async (t) => {
    await t.step(`(5 m) * (3)`, () => {
        const x = new Quantity(5, { units: "m" });
        const y = new Quantity(3);
        const z = x.multiply(y);
        assertEquals(z.magnitude, 15);
        assertEquals(z.dimensions, ONE_LENGTH_DIMENSION); // m
    });
    await t.step(`(5 m) * (3 m)`, () => {
        const x = new Quantity(5, { units: "m" });
        const y = new Quantity(3, { units: "m" });
        const z = x.multiply(y);
        assertEquals(z.magnitude, 15);
        assertEquals(z.dimensions, TWO_LENGTH_DIMENSIONS); // m²
    });
    await t.step(`(50 %) * (50 %)`, () => {
        const x = new Quantity(50, { units: "%" });
        const y = new Quantity(50, { units: "%" });
        const z = x.multiply(y);
        assertEquals(z.toString(), "25 %");
    });
    await t.step(`(50 %) * (400 g)`, () => {
        const x = new Quantity(50, { units: "%" });
        const y = new Quantity(400, { units: "g" });
        const z = x.multiply(y);
        assertEquals(z.toString(), "200 g");
    });
    await t.step(`(500 g) * (2 m/s^2)`, () => {
        const x = new Quantity(500, { units: "g" });
        const y = new Quantity(2, { units: "m/s^2" });
        const z = x.multiply(y);
        // equals 1 kg⋅m/s² (units of force)
        assertEquals(z.magnitude, 1.0);
        assertEquals(z.dimensions, FORCE_DIMENSIONS);
    });
    await t.step(`(5 ft) * (3 ft) - preserves unit`, () => {
        const x = new Quantity(5, { units: "ft" });
        const y = new Quantity(3, { units: "ft" });
        const z = x.multiply(y);
        assertEquals(z.toString(), "15 ft^2");
    });
    await t.step(`(5 ft) * (36 in) - preserves first unit`, () => {
        const x = new Quantity(5, { units: "ft" });
        const y = new Quantity(36, { units: "in" });
        // Due to binary floating point issues, we don't get exactly 15. But the key point is the units are "ft^2"
        assertEquals(x.multiply(y).get(), { magnitude: 14.999999999999998, units: "ft^2" });
    });
    await t.step(`(36 in) * (5 ft) - preserves first unit`, () => {
        const x = new Quantity(36, { units: "in" });
        const y = new Quantity(5, { units: "ft" });
        // Now the units are "in^2"
        assertEquals(x.multiply(y).toString(), "2160 in^2");
    });
    await t.step(`(5 ft) * (4 lb) - preserves combined unit`, () => {
        const x = new Quantity(5, { units: "ft" });
        const y = new Quantity(4, { units: "lb" });
        const z = x.multiply(y);
        assertEquals(z.toString(), "20 ft⋅lb");
    });
});

Deno.test("Uncertainty/tolerance", async (t) => {
    await t.step(`a number can have an uncertainty/tolerance value specified`, () => {
        const x = new Quantity(5, { units: "m", plusMinus: 0.02 });
        assertEquals(x.magnitude, 5);
        assertEquals(x.plusMinus, 0.02);
        assertEquals(x.toString(), "5±0.02 m");
    });

    await t.step(
        `uncertainty/tolerance is stored with full precision but toString() will print it to 1 sig fig unless it starts with '1' in which case two sig figs.`,
        async (t) => {
            // We use two sig figs for numbers starting with '1' because of https://physics.stackexchange.com/a/520937
            await t.step(`starts with 1`, () => {
                const x = new Quantity(500, { units: "m", plusMinus: 1.2345 });
                assertEquals(x.plusMinus, 1.2345);
                assertEquals(x.toString(), "500±1.2 m");
            });
            await t.step(`starts with 1`, () => {
                const x = new Quantity(2800, { units: "m", plusMinus: 12.315 });
                assertEquals(x.plusMinus, 12.315);
                assertEquals(x.toString(), "2800±12 m");
            });
            await t.step(`starts with 2`, () => {
                const x = new Quantity(515, { units: "m", plusMinus: 2.345 });
                assertEquals(x.plusMinus, 2.345);
                assertEquals(x.toString(), "515±2 m");
            });
            await t.step(`starts with 2`, () => {
                const x = new Quantity(0.381207, { units: "m", plusMinus: 0.000025 });
                assertEquals(x.plusMinus, 0.000025);
                assertEquals(x.toString(), "0.38121±0.00003 m"); // Notice the magnitude is rounded to match the uncertainty/error/tolerance
            });
        },
    );

    await t.step(`when adding two quantities, the error is added.`, () => {
        // x = (4.52 ± 0.02) cm, y = (2.0 ± 0.2) cm, w = (3.0 ± 0.6) cm
        // Then z = x + y - z = 0.5 ± 0.82 cm² which rounds to 0.5 ± 0.8 cm
        const x = new Quantity(4.52, { units: "cm", plusMinus: 0.02 });
        const y = new Quantity(2.0, { units: "cm", plusMinus: 0.2 });
        const w = new Quantity(3.0, { units: "cm", plusMinus: 0.6 });
        const z = x.add(y).sub(w);
        // The results are always stored with full precision:
        assertEquals(z.magnitude, 3.5199999999999995e-2); // in m
        assertEquals(z.plusMinus, 0.82e-2);
        // But toString() will round them by default, using the plusMinus value:
        assertEquals(z.toString(), "3.5±0.8 cm");
    });

    await t.step(`when multiplying two quantities, the relative error is added.`, () => {
        // x = (4.52 ± 0.02) cm, y = (2.0 ± 0.2) cm.
        // Then z = xy = 9.04 ± 0.944 cm² which rounds to 9.0 ± 0.9 cm²
        const x = new Quantity(4.52, { units: "cm", plusMinus: 0.02 });
        const y = new Quantity(2.0, { units: "cm", plusMinus: 0.2 });
        const z = x.multiply(y);
        // The results are always stored with full precision:
        assertEquals(z.magnitude, 9.04e-4); // in m
        assertEquals(z.plusMinus, 0.944e-4);
        // But toString() will round them by default, using the plusMinus value:
        assertEquals(z.toString(), "9.0±0.9 cm^2");
    });
});
