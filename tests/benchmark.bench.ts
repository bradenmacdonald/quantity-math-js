import { Q as ourQ } from "../mod.ts";

import JSQ_Qty from "npm:js-quantities@1.8.0";
import PQM from "npm:pqm@1.0.0";
import * as mathjs from "npm:mathjs@12.4.1";

Deno.bench("Quantity conversions - quantity-math-js", { group: "conversion", baseline: true }, () => {
    const Q = ourQ;
    const a = Q`400 g`;
    const b = Q`50 %`;
    const c = a.multiply(b); // 200 g
    const d = c.multiply(Q`50 m/s`); // 10,000 g * m / s (= 10 kg * m / s)
    const e = d.multiply(Q`0.1 s^-1`); // 1 kg * m / s^2 (= 1 N)
    const f = e.add(Q`5.5 N`);
    const g = f.multiply(Q`10`).add(Q`5 N`).add(Q`-20 N`).multiply(Q`2`);
    const h = g.getSI();
    if (`${h.magnitude} ${h.units}` !== "100 N") throw new Error(`Got ${h.toString()} unexpectedly.`);

    // And some crazy conversion:
    const orig = Q`500 uF`;
    const converted = orig.getWithUnits("h⋅s^3⋅A^2/lb⋅m⋅ft");
    if (`${converted.magnitude} ${converted.units}` !== "1.920207699666667e-8 h⋅s^3⋅A^2/lb⋅m⋅ft") {
        throw new Error(`Got ${converted.toString()} unexpectedly.`);
    }
});

Deno.bench("Quantity conversions - js-quantities", { group: "conversion" }, () => {
    const Q = JSQ_Qty;
    const a = Q(`400 g`);
    const b = Q(`50 %`);
    //const c = a.mul(b);
    a.mul(b); // should be 200 g, but with this library it equals "20000 g*%"
    const c = Q(`200 g`);
    const d = c.mul(Q(`50 m/s`)); // 10,000 g * m / s (= 10 kg * m / s)
    const e = d.mul(Q(`0.1 s^-1`)); // 1 kg * m / s^2 (= 1 N)
    const f = e.add(Q(`5.5 N`));
    const g = f.mul(Q(`10`)).add(Q(`5 N`)).add(Q(`-20 N`)).mul(Q(`2`));
    const h = g.toBase();
    // This library won't simplify to Newtons, since it's technically a derived unit.
    // So toBase() gives "100 kg*m/s2" not "100 N"
    if (h.toString() !== "100 kg*m/s2") throw new Error(`Got ${h.toString()} unexpectedly.`);

    // And some crazy conversion:
    const orig = Q(`500 uF`);
    const converted = orig.to("h*s^3*A^2/lb*m*ft");
    if (converted.toString() !== "1.9202076996666664e-8 h*s3*A2/lbs*m*ft") {
        throw new Error(`Got ${converted.toString()} unexpectedly.`);
    }
});

Deno.bench("Quantity conversions - PQM", { group: "conversion" }, () => {
    const Q = PQM.quantity;
    const a = Q(400, `g`);
    const b = Q(50, `%`);
    const c = a.mul(b);
    const d = c.mul(Q(50, `m/s`)); // 10,000 g * m / s (= 10 kg * m / s)
    const e = d.mul(Q(0.1, `s^-1`)); // 1 kg * m / s^2 (= 1 N)
    const f = e.add(Q(5.5, `N`));
    const g = f.mul(Q(10)).add(Q(5, `N`)).add(Q(-20, `N`)).mul(Q(2));
    const h = g.inSI();
    if (h.toString() !== "100,N") throw new Error(`Got ${h.toString()} unexpectedly.`);

    // And some crazy conversion:
    const orig = Q(500, `uF`);
    const converted: number = orig.in("hr s^3 A^2/lbm m ft");
    if (converted.toString() !== "1.920207699666667e-8") {
        throw new Error(`Got ${converted.toString()} unexpectedly.`);
    }
});

Deno.bench("Quantity conversions - mathjs", { group: "conversion" }, () => {
    const Q = mathjs.unit;
    const a = Q(400, `g`);
    const b = Q("0.5"); // Can't find a way to do "50 %" in mathjs ?
    const c = a.multiply(b);
    const d = c.multiply(Q(50, `m/s`)); // 10,000 g * m / s (= 10 kg * m / s)
    const e = d.multiply(Q(0.1, `s^-1`)); // 1 kg * m / s^2 (= 1 N)
    const f = mathjs.add(e, Q(5.5, `N`));
    const g = mathjs.add(mathjs.add(f.multiply(Q("10")), Q(5, `N`)), Q(-20, `N`)).multiply(Q("2"));
    const h = g.toSI();
    // This library won't simplify to Newtons, since it's technically a derived unit.
    if (h.toString() !== "100 (kg m) / s^2") throw new Error(`Got ${h.toString()} unexpectedly.`);

    // And some crazy conversion:
    const orig = Q(500, `uF`);
    const converted = orig.to("hr s^3 A^2/(lbm m ft)");
    if (converted.toString() !== "1.9202076996666667e-8 (hr s^3 A^2) / (lbm m ft)") {
        throw new Error(`Got ${converted.toString()} unexpectedly.`);
    }
});

Deno.bench("Custom units - quantity-math-js", { group: "custom", baseline: true }, () => {
    const Q = ourQ;
    const a = Q`400 _fleeb`;
    const b = Q`50 %`;
    const c = a.multiply(b); // 200 _fleeb
    const d = c.multiply(Q`50 _bil/_boop`); // 10,000 _fleeb _bil / _boop
    const e = d.multiply(Q`0.1 s^-1`); // 1,000 _fleeb _bil / _boop s
    const f = e.add(Q`500 _fleeb _bil / _boop s`); // 1,500 _fleeb _bil / _boop s
    const g = f.multiply(Q`10`).add(Q`5 _fleeb _bil / _boop s`).add(Q`-20 _fleeb _bil / _boop s`).multiply(Q`2`);
    if (g.toString() !== "29970 _fleeb⋅_bil/_boop⋅s") throw new Error(`Got ${g.toString()} unexpectedly.`);

    const h = g.multiply(Q`0.1 _schleem`).sub(Q`997 _fleeb _schleem _bil / _boop s`).multiply(Q`1 _boop / _bil`);
    if (h.toString() !== "2000 _fleeb⋅_schleem/s") throw new Error(`Got ${h.toString()} unexpectedly.`);
});

mathjs.createUnit("fleeb");
mathjs.createUnit("bil");
mathjs.createUnit("boop");
mathjs.createUnit("schleem");

Deno.bench("Custom units - math-js", { group: "custom" }, () => {
    const Q = mathjs.unit;
    const a = Q(`400 fleeb`);
    const b = Q("0.5"); // Can't find a way to do "50 %" in mathjs ?
    const c = a.multiply(b); // 200 fleeb
    const d = c.multiply(Q(`50 bil/boop`)); // 10,000 fleeb bil / boop
    const e = d.multiply(Q(`0.1 s^-1`)); // 1,000 fleeb bil / boop s
    const f = mathjs.add(e, Q(`500 fleeb bil / (boop s)`)); // 1,500 fleeb bil / boop s
    const g = mathjs.add(mathjs.add(f.multiply(Q(`10`)), Q(`5 fleeb bil / (boop s)`)), Q(`-20 fleeb bil / (boop s)`))
        .multiply(Q(`2`));
    if (g.toString() !== "29970 (fleeb bil) / (boop s)") throw new Error(`Got ${g.toString()} unexpectedly.`);

    const h = mathjs.subtract(g.multiply(Q(`0.1 schleem`)), Q(`997 fleeb schleem bil / (boop s)`)).multiply(
        Q(`1 boop / bil`),
    );
    if (h.toString() !== "2000 (fleeb schleem) / s") throw new Error(`Got ${h.toString()} unexpectedly.`);
});
