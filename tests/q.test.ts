import { assert } from "@std/assert";
import { Q, Quantity } from "../mod.ts";

Deno.test("Constructing Quantity instances with Q`...` template", async (t) => {
    await t.step("Q`15 m`", () => {
        const x = Q`15 m`;
        assert(x.equals(new Quantity(15, { units: "m" })));
        // Make sure our comparisons are generally working:
        assert(!x.equals(new Quantity(10, { units: "m" })));
        assert(!x.equals(new Quantity(15, { units: "ft" })));
    });

    await t.step('Q`15 ${"m"}`', () => {
        const x = Q`15 ${"m"}`;
        assert(x.equals(new Quantity(15, { units: "m" })));
    });

    await t.step('Q`15 ${"k" + "m"}`', () => {
        const x = Q`15 ${"k" + "m"}`;
        assert(x.equals(new Quantity(15, { units: "km" })));
    });

    await t.step('Q`${2} ${"kg"} ${"m"}`', () => {
        const x = Q`${2} ${"kg"} ${"m"}`;
        assert(x.equals(new Quantity(2, { units: "kg⋅m" })));
    });

    // The following don't directly use template interpolation via Q`...` literals but still
    // test the basics, and cover a lot more ground.

    const check = (short: string, expected: Quantity) =>
        t.step(`Q\`${short}\``, () => {
            const result = Q(short);
            assert(
                result.equals(expected),
                `Q\`${short}\` should equal ${expected.toString()} but got ${result.toString()}`,
            );
        });

    for (
        const [short, expected] of [
            [`15m`, new Quantity(15, { units: "m" })],
            [`400mm^3`, new Quantity(400, { units: "mm^3" })],
        ] as const
    ) await check(short, expected);

    // These four are all the same:
    for (
        const short of [
            `15     kg⋅m`,
            `15     kg m`,
            `15kg m`,
            `15m kg`,
        ]
    ) {
        await check(short, new Quantity(15, { units: "kg⋅m" }));
    }
    // These three are all the same:
    for (
        const short of [
            `-.05123kg⋅m/s^2`,
            `-000.0512300kg⋅m/s^2`,
            `-.05123  kg m s^-2`,
        ]
    ) {
        await check(short, new Quantity(-.05123, { units: "kg⋅m/s^2" }));
    }

    await check(`15.5 ± 0.2 kg`, new Quantity(15.5, { units: "kg", plusMinus: 0.2 }));
    await check(`0.2±.01 g`, new Quantity(0.2, { units: "g", plusMinus: 0.01 }));
    await check(`60±5 W`, new Quantity(60, { units: "W", plusMinus: 5 }));
    await check(`+60±5.0000 W`, new Quantity(60, { units: "W", plusMinus: 5 }));
});
