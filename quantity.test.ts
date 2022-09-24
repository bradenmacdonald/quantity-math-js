import {
    assert,
    assertEquals,
    assertFalse,
    assertNotEquals,
} from "./asserts.test.ts";
import { Quantity } from "./quantity.ts";

Deno.test("Quality instance equality", async (t) => {
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
});
