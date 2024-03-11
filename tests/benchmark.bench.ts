import { Q as ourQ } from "../mod.ts";

import JSQ_Qty from "npm:js-quantities@1.8.0";
import PQM from "npm:pqm@1.0.0";

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
