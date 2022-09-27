import { assertEquals, assertThrows } from "./asserts.test.ts";
import { QuantityError } from "./error.ts";
import { builtInUnits, ParsedUnit, parseUnit } from "./units.ts";

Deno.test(`parseUnit()`, async (t) => {
    const pairs: [input: string, output: ParsedUnit[]][] = [
        ["mm", [{ prefix: "m", unit: builtInUnits.m, power: 1 }]],
        ["km", [{ prefix: "k", unit: builtInUnits.m, power: 1 }]],
        ["km^2", [{ prefix: "k", unit: builtInUnits.m, power: 2 }]],
        ["km/s", [{ prefix: "k", unit: builtInUnits.m, power: 1 }, {
            unit: builtInUnits.s,
            power: -1,
        }]],
        ["kg⋅m/s^2", [{ prefix: "k", unit: builtInUnits.g, power: 1 }, {
            unit: builtInUnits.m,
            power: 1,
        }, { unit: builtInUnits.s, power: -2 }]],
        ["kg m / s^2", [{ prefix: "k", unit: builtInUnits.g, power: 1 }, {
            unit: builtInUnits.m,
            power: 1,
        }, { unit: builtInUnits.s, power: -2 }]],
        ["kg*m*s^-2", [{ prefix: "k", unit: builtInUnits.g, power: 1 }, {
            unit: builtInUnits.m,
            power: 1,
        }, { unit: builtInUnits.s, power: -2 }]],
    ];

    for (const [unitStr, result] of pairs) {
        await t.step(`parseUnit("${unitStr}")`, () => {
            assertEquals(parseUnit(unitStr), result);
        });
    }

    await t.step("benchmark", () => {
        const start = performance.now();
        for (let i = 0; i < 100_000; i++) {
            for (const pair of pairs) {
                parseUnit(pair[0]);
            }
        }
        const time = performance.now() - start;
        console.log(
            `Took ${time}ms to parse ${pairs.length} unit strings 100,000 times`,
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
