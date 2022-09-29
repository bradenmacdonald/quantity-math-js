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
    await check(120, { units: "s" }, "min", { magnitude: 2 });
    await check(3, { units: "min" }, "s", { magnitude: 180 });
    await check(45, { units: "min" }, "h", { magnitude: 0.75 });
    await check(1, { units: "h" }, "s", { magnitude: 3600 });
    await check(24, { units: "h" }, "day", { magnitude: 1 });
    await check(2, { units: "day" }, "h", { magnitude: 48 });
    await check(7, { units: "day" }, "week", { magnitude: 1 });
    await check(2, { units: "week" }, "day", { magnitude: 14 });
    await check(1, { units: "yr" }, "day", { magnitude: 365 });
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
    // Force:
    await check(1234, { units: "kg⋅m/s^2" }, "N", { magnitude: 1234 });
    await check(1234, { units: "N" }, "g⋅m/s^2", { magnitude: 1234000 });
    // Energy
    await check(-17, { units: "N⋅m" }, "J", { magnitude: -17 });
    await check(3.68, { units: "W⋅s" }, "J", { magnitude: 3.68 });
    await check(1, { units: "kWh" }, "MJ", { magnitude: 3.6 });
    await check(7.2, { units: "MJ" }, "kWh", { magnitude: 2 });
    // Power
    await check(2.5, { units: "kW" }, "HP", { magnitude: 3.352555224 });
    await check(1, { units: "HP" }, "W", { magnitude: 745.699871582 });
    // Volume
    await check(1.5, { units: "L" }, "cm^3", { magnitude: 1500 });
    await check(1234, { units: "cm^3" }, "L", { magnitude: 1.234 });
    // Misc

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
