import { prefixes, units } from "./units.ts"

Deno.test("units never start with prefixes", () => {

    for (const unitName of Object.keys(units)) {
        for (const prefix of Object.keys(prefixes)) {
            if (unitName.startsWith(prefix)) {
                throw new Error(`The unit ${unitName} starts with the prefix ${prefix}!`);
            }
        }
    }
})