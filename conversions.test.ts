import { assertEquals, assertThrows } from "./asserts.test.ts";
import { QuantityError } from "./error.ts";
import { Quantity, SerializedQuantity } from "./quantity.ts";

Deno.test("Quantity conversions", async (t) => {
    const check = async (
        orig: number,
        options: ConstructorParameters<typeof Quantity>[1] & { units: string },
        outUnits: string,
        expected: Omit<SerializedQuantity, "units">,
    ) => {
        await t.step(`${orig} ${options.units} is ${expected.magnitude} ${outUnits}`, () => {
            const q1 = new Quantity(orig, options);
            const result = q1.getWithUnits(outUnits);
            // Do some rounding so we ignore minor differences that come from binary arithmetic issues:
            result.magnitude = Math.round(result.magnitude * 1_000_000_000) / 1_000_000_000;
            assertEquals(result, { ...expected, units: outUnits });
        });
    };

    // Non-dimensional:
    await check(15, { units: "%" }, "", { magnitude: 0.15 });
    await check(0.5, { units: "" }, "%", { magnitude: 50 });
    await check(300, { units: "ppm" }, "", { magnitude: 300e-6 });
    // Distance:
    await check(1, { units: "cm" }, "m", { magnitude: 0.01 });
    await check(2, { units: "in" }, "m", { magnitude: 0.0508 });
    await check(12, { units: "in" }, "ft", { magnitude: 1 });
    // Mass:
    await check(500, { units: "g" }, "kg", { magnitude: 0.5 });
    // Time:
    await check(500, { units: "ms" }, "s", { magnitude: 0.5 });
    await check(120, { units: "s" }, "min", { magnitude: 2 });
    await check(3, { units: "min" }, "s", { magnitude: 180 });
    await check(45, { units: "min" }, "h", { magnitude: 0.75 });
    await check(1, { units: "h" }, "s", { magnitude: 3600 });
    await check(24, { units: "h" }, "day", { magnitude: 1 });
    await check(2, { units: "day" }, "h", { magnitude: 48 });
    await check(7, { units: "day" }, "week", { magnitude: 1 });
    await check(2, { units: "week" }, "day", { magnitude: 14 });
    await check(1, { units: "yr" }, "day", { magnitude: 365 });
    await check(2, { units: "ka" }, "yr", { magnitude: 2000 });
    await check(3, { units: "Ma" }, "yr", { magnitude: 3_000_000 });
    await check(4, { units: "Ga" }, "yr", { magnitude: 4_000_000_000 });
    // Temperature:
    await check(5, { units: "K" }, "deltaC", { magnitude: 5 });
    await check(100, { units: "degF" }, "degC", { magnitude: 37.777777778 });
    await check(100, { units: "degC" }, "degF", { magnitude: 212 });
    await check(50, { units: "degC" }, "degF", { magnitude: 122 });
    await check(0, { units: "degC" }, "degF", { magnitude: 32 });
    await check(300, { units: "degC" }, "degC", { magnitude: 300 });
    await check(300, { units: "K" }, "degC", { magnitude: 26.85 });
    await check(0, { units: "K" }, "degC", { magnitude: -273.15 });
    // Speed:
    await check(1, { units: "m/s" }, "km/h", { magnitude: 3.6 });
    await check(1, { units: "c" }, "m/s", { magnitude: 299792458 });
    // Pressure
    await check(1, { units: "Pa" }, "N/m^2", { magnitude: 1 });
    await check(123, { units: "kPa" }, "psi", { magnitude: 17.839641741 });
    await check(50, { units: "psi" }, "kPa", { magnitude: 344.737864658 });
    await check(50, { units: "psi" }, "kN/m^2", { magnitude: 344.737864658 });
    await check(1, { units: "atm" }, "kPa", { magnitude: 101.325 });
    // Force:
    await check(1234, { units: "kg⋅m/s^2" }, "N", { magnitude: 1234 });
    await check(1234, { units: "N" }, "g⋅m/s^2", { magnitude: 1234000 });
    // Energy
    await check(-17, { units: "N⋅m" }, "J", { magnitude: -17 });
    // For eV we have to check without rounding:
    const eV = new Quantity(1, { units: "eV" });
    assertEquals(eV.getWithUnits("J"), { magnitude: 1.602176634e-19, units: "J" });
    await check(3.68, { units: "W⋅s" }, "J", { magnitude: 3.68 });
    await check(1, { units: "kWh" }, "MJ", { magnitude: 3.6 });
    await check(7.2, { units: "MJ" }, "kWh", { magnitude: 2 });
    await check(1, { units: "BTU" }, "J", { magnitude: 1055.05585 });
    // Power
    await check(2.5, { units: "kW" }, "HP", { magnitude: 3.352555224 });
    await check(1, { units: "HP" }, "W", { magnitude: 745.699871582 });
    // Volume
    await check(317, { units: "mL" }, "cm^3", { magnitude: 317 });
    await check(1.5, { units: "L" }, "cm^3", { magnitude: 1500 });
    await check(1234, { units: "cm^3" }, "L", { magnitude: 1.234 });
    // Area
    await check(1, { units: "ha" }, "m^2", { magnitude: 1e4 });
    // Information
    await check(24, { units: "b" }, "B", { magnitude: 3 }); // 24 bits is 3 bytes
    await check(1, { units: "B" }, "b", { magnitude: 8 }); // 1 Byte is 8 bits
    await check(1, { units: "KiB" }, "B", { magnitude: 1024 }); // 1 KibiByte is 1024 bytes
    await check(1, { units: "MiB" }, "B", { magnitude: 1_048_576 }); // A mebibyte equals 2^20 or 1,048,576 bytes.
    await check(1, { units: "MiB" }, "KiB", { magnitude: 1024 });
    await check(1, { units: "GB" }, "B", { magnitude: 1e9 }); // As used in e.g. hard drive capacity, a "Gigabyte" is 1 billion bytes
    await check(1, { units: "GiB" }, "B", { magnitude: 1_073_741_824 }); // As used in e.g. software, or memory, a "gibibyte" is 2^30 bytes
    await check(1, { units: "GiB" }, "MiB", { magnitude: 1024 });
    await check(1, { units: "TiB" }, "GiB", { magnitude: 1024 });
    await check(1, { units: "PiB" }, "TiB", { magnitude: 1024 });
    await check(1, { units: "EiB" }, "PiB", { magnitude: 1024 });
    await check(1, { units: "ZiB" }, "EiB", { magnitude: 1024 });
    await check(1, { units: "YiB" }, "ZiB", { magnitude: 1024 });

    // Electromagnetism
    await check(1, { units: "A" }, "C/s", { magnitude: 1 }); // 1 Ampere is 1 C/s
    await check(1, { units: "C" }, "A⋅s", { magnitude: 1 });
    await check(1, { units: "mAh" }, "mA⋅h", { magnitude: 1 }); // amp hour
    await check(1, { units: "Ah" }, "C", { magnitude: 3600 });
    await check(1, { units: "V" }, "kg⋅m^2 / A⋅s^3", { magnitude: 1 });
    await check(1, { units: "ohm" }, "kg⋅m^2 / A^2⋅s^3", { magnitude: 1 });
    await check(1, { units: "F" }, "s^4⋅A^2 / kg^1⋅m^2", { magnitude: 1 });
    await check(1, { units: "H" }, "kg⋅m^2 / s^2⋅A^2", { magnitude: 1 });
    await check(1, { units: "S" }, "ohm^-1", { magnitude: 1 });
    await check(1, { units: "Wb" }, "kg⋅m^2 / s^2⋅A^1", { magnitude: 1 });
    await check(1, { units: "T" }, "Wb / m^2", { magnitude: 1 });
    // Misc
    await check(1, { units: "M" }, "mol / L", { magnitude: 1 }); // molar concentration
    await check(1, { units: "Hz" }, "s^-1", { magnitude: 1 }); // Hertz

    await t.step("invalid conversions", () => {
        assertThrows(
            () => {
                new Quantity(3, { units: "kg" }).getWithUnits("m");
            },
            QuantityError,
            "Cannot convert units that aren't compatible.",
        );
        assertThrows(
            () => {
                new Quantity(1, { units: "day" }).getWithUnits("kg");
            },
            QuantityError,
            "Cannot convert units that aren't compatible.",
        );
    });
});

Deno.test("Conversions to SI", async (t) => {
    const checkSI = async (
        orig: number,
        options: ConstructorParameters<typeof Quantity>[1] & { units: string },
        expected: SerializedQuantity,
    ) => {
        await t.step(`${orig} ${options.units} is ${expected.magnitude} ${expected.units}`, () => {
            const q1 = new Quantity(orig, options);
            const result = q1.getSI();
            // Do some rounding so we ignore minor differences that come from binary arithmetic issues:
            try {
                assertEquals(result, expected);
            } catch {
                result.magnitude = Math.round(result.magnitude * 1_000_000_000) / 1_000_000_000;
                assertEquals(result, expected);
            }
        });
    };

    // Non-dimensional:
    await checkSI(100, { units: "" }, { magnitude: 100, units: "" });
    await checkSI(15, { units: "%" }, { magnitude: 0.15, units: "" });
    await checkSI(300, { units: "ppm" }, { magnitude: 300e-6, units: "" });
    // With simple SI units:
    await checkSI(10, { units: "s" }, { magnitude: 10, units: "s" });
    await checkSI(10, { units: "s^-1" }, { magnitude: 10, units: "s^-1" }); // Note we always prefer s^1 to Hz
    await checkSI(10, { units: "Hz" }, { magnitude: 10, units: "s^-1" }); // Note we always prefer s^1 to Hz
    await checkSI(1, { units: "cm" }, { magnitude: 0.01, units: "m" });
    await checkSI(1234, { units: "kg⋅m/s^2" }, { magnitude: 1234, units: "N" });
    await checkSI(1234, { units: "s^2/kg⋅m" }, { magnitude: 1234, units: "N^-1" });
    await checkSI(36, { units: "km/h" }, { magnitude: 10, units: "m/s" });
    await checkSI(30, { units: "degC" }, { magnitude: 303.15, units: "K" });
    await checkSI(70, { units: "degF" }, { magnitude: 294.261111111, units: "K" });
    await checkSI(12, { units: "kg⋅m^2 / A⋅s^3" }, { magnitude: 12, units: "V" });
    await checkSI(17.2, { units: "HP" }, { magnitude: 12826.037791215, units: "W" });
    await checkSI(100, { units: "BTU" }, { magnitude: 105505.585, units: "J" });
    await checkSI(60, { units: "psi" }, { magnitude: 413685.437590102, units: "Pa" });
    await checkSI(10, { units: "ft" }, { magnitude: 3.048, units: "m" });
    await checkSI(5, { units: "kg⋅m^2⋅s^-2⋅A^-3" }, { magnitude: 5, units: "H/A" });
    await checkSI(5, { units: "kg^2⋅m^2⋅s^-4⋅A^-2" }, { magnitude: 5, units: "kg/F" });
    await checkSI(5, { units: "C⋅K⋅Ah" }, { magnitude: 18000, units: "C^2⋅K" });
    await checkSI(5, { units: "W⋅s^2" }, { magnitude: 5, units: "J⋅s" });
    await checkSI(5, { units: "C⋅A⋅s^2/kg⋅m^2" }, { magnitude: 5, units: "ohm^-1" });
    await checkSI(5, { units: "ft⋅lb" }, { magnitude: 0.691274772, units: "kg⋅m" });
    // Complex units that can't be simplified
    await checkSI(5, { units: "V⋅kg^3⋅b^2⋅K^4⋅mol" }, { magnitude: 5, units: "V⋅kg^3⋅K^4⋅mol⋅b^2" });
});
