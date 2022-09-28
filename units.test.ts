import { assertEquals, assertThrows } from "./asserts.test.ts";
import { QuantityError } from "./error.ts";
import { ParsedUnit, parseUnit } from "./units.ts";

Deno.test(`parseUnit()`, async (t) => {
    const pairs: [input: string, output: ParsedUnit[]][] = [
        ["mm", [{ prefix: "m", unit: "m", power: 1 }]],
        ["km", [{ prefix: "k", unit: "m", power: 1 }]],
        ["km^2", [{ prefix: "k", unit: "m", power: 2 }]],
        ["km/s", [
            { prefix: "k", unit: "m", power: 1 },
            { unit: "s", power: -1 },
        ]],
        ["kg⋅m/s^2", [
            { prefix: "k", unit: "g", power: 1 },
            { unit: "m", power: 1 },
            { unit: "s", power: -2 },
        ]],
        ["kg m / s^2", [
            { prefix: "k", unit: "g", power: 1 },
            { unit: "m", power: 1 },
            { unit: "s", power: -2 },
        ]],
        ["kg*m*s^-2", [
            { prefix: "k", unit: "g", power: 1 },
            { unit: "m", power: 1 },
            { unit: "s", power: -2 },
        ]],
        ["pphpd", [
            { unit: "pphpd", power: 1 },
        ]],
    ];

    for (const [unitStr, result] of pairs) {
        await t.step(`parseUnit("${unitStr}")`, () => {
            assertEquals(parseUnit(unitStr), result);
        });
    }

    await t.step("benchmark", () => {
        const start = performance.now();
        for (let i = 0; i < 10_000; i++) {
            for (const pair of pairs) {
                parseUnit(pair[0]);
            }
        }
        const time = performance.now() - start;
        console.log(
            `Took ${time}ms to parse ${pairs.length} unit strings 10,000 times`,
        );
    });
});

Deno.test(`parseUnit() - invalid Strings`, async (t) => {
    const pairs: [input: string, errorMsg: string][] = [
        ["foo", `Unable to parse the unit "foo"`],
        ["mm^X", `Invalid exponent/power on unit "mm^X"`],
        ["mm^1.5", `Invalid exponent/power on unit "mm^1.5"`],
    ];

    for (const [unitStr, errorMsg] of pairs) {
        await t.step(`parseUnit("${unitStr}")`, () => {
            assertThrows(() => parseUnit(unitStr), QuantityError, errorMsg);
        });
    }
});
