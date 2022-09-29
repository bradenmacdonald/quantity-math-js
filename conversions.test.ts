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

    // Distance:
    await check(1, { units: "cm" }, "m", { magnitude: 0.01 });
    await check(2, { units: "in" }, "m", { magnitude: 0.0508 });
    await check(12, { units: "in" }, "ft", { magnitude: 1 });
    // Mass:
    await check(500, { units: "g" }, "kg", { magnitude: 0.5 });
    // Time:
    await check(1, { units: "hr" }, "s", { magnitude: 3600 });
    // Temperature:
    await check(5, { units: "K" }, "deltaC", { magnitude: 5 });
    await check(100, { units: "degF" }, "degC", { magnitude: 37.777777778 });
    await check(100, { units: "degC" }, "degF", { magnitude: 212 });
    await check(50, { units: "degC" }, "degF", { magnitude: 122 });
    await check(0, { units: "degC" }, "degF", { magnitude: 32 });
    await check(300, { units: "degC" }, "degC", { magnitude: 300 });
    await check(300, { units: "K" }, "degC", { magnitude: 26.85 });
    await check(0, { units: "K" }, "degC", { magnitude: -273.15 });

    await t.step("invalid conversions", () => {
        assertThrows(
            () => {
                new Quantity(3, { units: "kg" }).getWithUnits("m");
            },
            QuantityError,
            "Cannot convert units that aren't compatible.",
        );
    });
});
