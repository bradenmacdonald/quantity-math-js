import { assertEquals, assertThrows } from "@std/assert";
import { Dimensions, QuantityError } from "../mod.ts";

const baseDimensions = [0, 0, 0, 0, 0, 0, 0, 0] as const;

Deno.test(`Dimensions constructor`, async (t) => {
    await t.step(
        `it requires that all of the basic dimensions have names`,
        () => {
            assertThrows(
                () => {
                    // @ts-expect-error: array has too few entries
                    new Dimensions([]);
                },
                QuantityError,
                "not enough dimensions specified for Quantity.",
            );

            assertThrows(
                () => {
                    // @ts-expect-error: array has too few entries
                    new Dimensions([1, 2, 3, 4, 5, 6, 7]);
                },
                QuantityError,
                "not enough dimensions specified for Quantity.",
            );

            // This one throws no error:
            new Dimensions([1, 2, 3, 4, 5, 6, 7, 8]);
        },
    );

    await t.step(
        `it requires that custom dimensions have names (1 custom dimension)`,
        () => {
            assertThrows(
                () => {
                    new Dimensions([...baseDimensions, 1]); // No name is specified
                },
                QuantityError,
                `If a Quantity includes custom dimensions, they must be named via customDimensionNames`,
            );
            // Whereas this won't throw:
            new Dimensions([...baseDimensions, 1], ["oneDimension"]);
        },
    );

    await t.step(
        `it requires that custom dimensions have names (4 custom dimension)`,
        () => {
            assertThrows(
                () => {
                    new Dimensions([...baseDimensions, 1, 0, 1, 0]);
                },
                QuantityError,
                `If a Quantity includes custom dimensions, they must be named via customDimensionNames`,
            );
            // Whereas this won't throw:
            // deno-fmt-ignore
            new Dimensions([...baseDimensions, 1, 0, 1, 0], ["a", "b", "c", "d"]);
        },
    );

    await t.step(`it throws if an extra custom dimension name is given`, () => {
        assertThrows(() => {
            new Dimensions([...baseDimensions], ["custom1"]);
        }, QuantityError);
        assertThrows(() => {
            new Dimensions([...baseDimensions, 1], ["custom1", "custom2"]);
        }, QuantityError);
    });

    await t.step(
        `it requires that custom dimensions are unique`,
        () => {
            assertThrows(
                () => {
                    new Dimensions([...baseDimensions, 1, 0], ["a", "a"]);
                },
                QuantityError,
                `customDimensionNames is not sorted into the correct alphabetical order.`,
            );
            // Whereas this won't throw:
            new Dimensions([...baseDimensions, 1, 0], ["a", "b"]);
        },
    );

    await t.step(
        `it requires that custom dimensions in alphabetical order`,
        () => {
            assertThrows(
                () => {
                    new Dimensions([...baseDimensions, 1, 0], ["aab", "aaa"]);
                },
                QuantityError,
                `customDimensionNames is not sorted into the correct alphabetical order.`,
            );
            // Whereas this won't throw:
            new Dimensions([...baseDimensions, 1, 0], ["aaa", "aab"]);
        },
    );
});

Deno.test(`Multiplying custom dimensions`, async (t) => {
    await t.step(`same custom dimensions (1)`, () => {
        const a = new Dimensions([...baseDimensions, 1], ["foo"]);
        const b = new Dimensions([...baseDimensions, 1], ["foo"]);
        const c = a.multiply(b);
        assertEquals(c, new Dimensions([...baseDimensions, 2], ["foo"]));
    });

    await t.step(`same custom dimensions (4)`, () => {
        const a = new Dimensions([...baseDimensions, 1, 2, 0, -3], ["abc", "bar", "foo", "zzzzzzz"]);
        const b = new Dimensions([...baseDimensions, 0, 1, -1, -2], ["abc", "bar", "foo", "zzzzzzz"]);
        const c = a.multiply(b);
        assertEquals(c, new Dimensions([...baseDimensions, 1, 3, -1, -5], ["abc", "bar", "foo", "zzzzzzz"]));
    });

    await t.step(`different custom dimensions (4)`, () => {
        const a = new Dimensions([...baseDimensions, 1, 2], ["bar", "foo"]);
        const b = new Dimensions([...baseDimensions, 4, 8], ["foo", "tribble"]);
        const c = a.multiply(b);
        assertEquals(c, new Dimensions([...baseDimensions, 1, 6, 8], ["bar", "foo", "tribble"]));
        assertEquals(c, b.multiply(a));
    });
});

Deno.test(`toString`, async (t) => {
    await t.step(`dimensionless`, () => {
        assertEquals(new Dimensions([...baseDimensions]).toString(), "[0,0,0,0,0,0,0,0]");
    });
    await t.step(`[0,2,4,6,8,0,0,-3]`, () => {
        assertEquals(new Dimensions([0, 2, 4, 6, 8, 0, 0, -3]).toString(), "[0,2,4,6,8,0,0,-3]");
    });
    await t.step(`[0,2,4,6,8,0,0,-3,7] with 7 in a custom "foo" dimension`, () => {
        assertEquals(new Dimensions([0, 2, 4, 6, 8, 0, 0, -3, 7], ["foo"]).toString(), "[0,2,4,6,8,0,0,-3,foo:7]");
    });
    await t.step(`different custom dimensions (4)`, () => {
        assertEquals(
            new Dimensions([...baseDimensions, 1, 2, 0, -3], ["abc", "bar", "foo", "zzzzzzz"]).toString(),
            "[0,0,0,0,0,0,0,0,abc:1,bar:2,foo:0,zzzzzzz:-3]",
        );
    });
});
