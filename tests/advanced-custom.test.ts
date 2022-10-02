import { assertEquals } from "./asserts.test.ts";
import { Dimensions, Quantity } from "../mod.ts";

Deno.test("Units with 'custom' dimensions", async (t) => {
    await t.step(`foos and bars`, () => {
        const f = new Quantity(10, { units: "_foo" });
        assertEquals(f.toString(), "10 _foo");

        const b = new Quantity(2, { units: "_bar" });
        assertEquals(b.toString(), "2 _bar");

        const f2 = f.add(f);
        assertEquals(f2.toString(), "20 _foo");

        const ff = f.multiply(f);
        assertEquals(ff.toString(), "100 _foo^2");

        const fb = f.multiply(b);
        assertEquals(fb.toString(), "20 _foo⋅_bar");

        assertEquals(fb.multiply(new Quantity(1, { units: "_bar^-1" })).toString(), "20 _foo");
    });

    await t.step(`pphpd ("passengers per hour per direction")`, async (t) => {
        await t.step(`constructing a Quantity`, () => {
            const q = new Quantity(3400, { units: "pphpd" });
            assertEquals(
                q.dimensions,
                new Dimensions([0, 0, -1, 0, 0, 0, 0, 0, -1, 1], [
                    "dir",
                    "pax",
                ]),
            );
            assertEquals(q.get(), {
                magnitude: 3400,
                units: "pphpd",
            });
        });

        await t.step(`addition`, () => {
            const a = new Quantity(3400, { units: "pphpd" });
            const b = new Quantity(1200, { units: "pphpd" });
            const sum = a.add(b);
            assertEquals(sum.get(), {
                magnitude: 4600,
                units: "pphpd",
            });
        });

        await t.step(`multiplication`, () => {
            // This multiplication doesn't make much sense but let's check if the unit is preserved:
            const a = new Quantity(3400, { units: "pphpd" });
            const b = new Quantity(2, { units: "pphpd" });
            const product = a.multiply(b);
            assertEquals(product.get(), {
                magnitude: 6800,
                units: "pphpd^2",
            });
        });

        await t.step(`multiplication by partial unit`, () => {
            // If a gondola can carry 3400 pphpd (passengers per hour per direction), how many passengers (pax) per day per direction?
            const a = new Quantity(3400, { units: "pphpd" });
            const b = new Quantity(1, { units: "day" });
            const product = a.multiply(b);
            assertEquals(product.get(), {
                magnitude: 3_400,
                units: "pphpd⋅day",
            });
            assertEquals(product.getWithUnits(`_pax/_dir`), {
                magnitude: 3_400 * 24,
                units: "_pax/_dir",
            });
        });
    });
});
