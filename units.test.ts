import { assertEquals, assertThrows } from "./asserts.test.ts";
import { QuantityError } from "./error.ts";
import { ParsedUnit, parseUnits } from "./units.ts";

Deno.test(`parseUnits()`, async (t) => {
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
        ["kg⋅m⋅s^-2", [
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
            assertEquals(parseUnits(unitStr), result);
        });
    }

    await t.step("benchmark", () => {
        const start = performance.now();
        for (let i = 0; i < 10_000; i++) {
            for (const pair of pairs) {
                parseUnits(pair[0]);
            }
        }
        const time = performance.now() - start;
        console.log(
            `Took ${time}ms to parse ${pairs.length} unit strings 10,000 times`,
        );
    });
});

Deno.test(`parseUnits() - invalid Strings`, async (t) => {
    const pairs: [input: string, errorMsg: string][] = [
        ["foo", `Unable to parse the unit "foo"`],
        ["mm^X", `Invalid exponent/power on unit "mm^X"`],
        ["mm^1.5", `Invalid exponent/power on unit "mm^1.5"`],
        ["mm^5px", `Invalid exponent/power on unit "mm^5px"`],
        ["mm^0", `Invalid exponent/power on unit "mm^0"`],
        // These units do not support binary prefixes:
        ["Kim", `Unable to parse the unit "Kim"`], // kibimeter
        ["Gim", `Unable to parse the unit "Gim"`], // Gibimeter
        // These units do not support prefixes:
        ["k%", `Unable to parse the unit "k%"`], // kilo-percent
        ["mlb", `Unable to parse the unit "mlb"`], // milli-pound
        ["nin", `Unable to parse the unit "nin"`], // nano-inch
        ["Mft", `Unable to parse the unit "Mft"`], // mega-foot
        ["mmin", `Unable to parse the unit "mmin"`], // milli-minute
        ["kh", `Unable to parse the unit "kh"`], // kilo-hour
        ["kka", `Unable to parse the unit "kka"`], // kilo-kilo-annum
    ];

    for (const [unitStr, errorMsg] of pairs) {
        await t.step(`parseUnit("${unitStr}")`, () => {
            assertThrows(() => parseUnits(unitStr), QuantityError, errorMsg);
        });
    }
});
