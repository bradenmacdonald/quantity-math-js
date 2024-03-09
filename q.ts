import { Quantity, QuantityError } from "@bradenmacdonald/quantity-math-js";

export function Q(strings: string | ReadonlyArray<string>, ...keys: unknown[]): Quantity {
    let fullString: string;
    if (typeof strings == "string") {
        fullString = strings;
    } else {
        fullString = strings[0];
        for (let i = 0; i < keys.length; i++) {
            fullString += String(keys[i]);
            fullString += strings[i + 1];
        }
    }
    const match = /([-+]?\d*\.?\d*)(\s*±\s*([\d\.]+))?\s*(.*)/.exec(fullString);
    if (match === null) throw new QuantityError(`Unable to parse Q template string: ${fullString}`);
    const magnitude = parseFloat(match[1]);
    const plusMinusStr = match[3];
    const plusMinus = plusMinusStr ? parseFloat(plusMinusStr) : undefined;
    const units = match[4];
    return new Quantity(magnitude, { units, plusMinus });
}
