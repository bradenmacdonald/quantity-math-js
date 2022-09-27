import { assertThrows } from "./asserts.test.ts";
import { Dimensions } from "./dimensions.ts";
import { QuantityError } from "./error.ts";

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

    const baseDimensions = [0, 0, 0, 0, 0, 0, 0, 0] as const;

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
            new Dimensions([...baseDimensions, 1, 0, 1, 0], [ "a", "b", "c", "d"]);
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
