import { assertEquals, assertThrows } from "@std/assert";
import { builtInUnits, ParsedUnit, parseUnits, QuantityError } from "../mod.ts";
import { prefixes, Unit } from "../units.ts";

Deno.test(`parseUnits()`, async (t) => {
    const pairs: [input: string, output: ParsedUnit[]][] = [
        ["mm", [{ prefix: "m", unit: "m", power: 1 }]],
        ["km", [{ prefix: "k", unit: "m", power: 1 }]],
        ["km^2", [{ prefix: "k", unit: "m", power: 2 }]],
        ["uF", [{ prefix: "u", unit: "F", power: 1 }]],
        ["µF", [{ prefix: "µ", unit: "F", power: 1 }]],
        ["Rg", [{ prefix: "R", unit: "g", power: 1 }]],
        ["Qg", [{ prefix: "Q", unit: "g", power: 1 }]],
        ["yg", [{ prefix: "y", unit: "g", power: 1 }]],
        ["qg", [{ prefix: "q", unit: "g", power: 1 }]],
        ["mV^2", [{ prefix: "m", unit: "V", power: 2 }]],
        ["MHz", [{ prefix: "M", unit: "Hz", power: 1 }]],
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

Deno.test("check for ambiguous units", async (t) => {
    // Make sure we don't have any unit where some prefix + the unit abbreviation equals the abbreviation of another unit.
    // e.g. "m" (milli) + "in" (inches) = "min" = milli-inches or minutes?
    // (That's why we don't allow prefixes on non-SI units like inches.)
    const regularPrefixes = Object.keys(prefixes).filter((prefix) =>
        !prefix.endsWith("i")
    ) as (keyof typeof prefixes)[];
    const binaryPrefixes = Object.keys(prefixes).filter((prefix) => prefix.endsWith("i")) as (keyof typeof prefixes)[];

    for (const [unitAbbrev, unitData] of Object.entries(builtInUnits as Record<string, Unit>)) {
        if (unitData.prefixable) {
            await t.step(`${unitAbbrev} with regular SI prefixes`, () => {
                // Test all the non-binary prefixes:
                for (const prefix of regularPrefixes) {
                    assertEquals(
                        parseUnits(`${prefix}${unitAbbrev}`),
                        [{ prefix, unit: unitAbbrev, power: 1 }],
                    );
                }
            });
        }
        if (unitData.binaryPrefixable) {
            await t.step(`${unitAbbrev} with binary SI prefixes`, () => {
                // Test all the binary prefixes:
                for (const prefix of binaryPrefixes) {
                    assertEquals(
                        parseUnits(`${prefix}${unitAbbrev}`),
                        [{ prefix, unit: unitAbbrev, power: 1 }],
                    );
                }
            });
        }
    }
});
