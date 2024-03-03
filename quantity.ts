import { Dimensionless, Dimensions } from "./dimensions.ts";
import { QuantityError } from "./error.ts";
import { getUnitData, ParsedUnit, parseUnits, prefixes, toUnitString } from "./units.ts";

export interface SerializedQuantity {
    magnitude: number;
    significantFigures?: number;
    plusMinus?: number;
    units: string;
}

// Private constructor parameter to pass '_unitHintSet' values.
const setUnitHintSet = Symbol("unitHintSet");

export class Quantity {
    /** The magnitude (numeric part) of this Quantity value. Always in the base units (kg, m, s, etc.). */
    public get magnitude(): number {
        return this._magnitude;
    }
    protected _dimensions: Dimensions;
    public get dimensions(): Dimensions {
        return this._dimensions;
    }
    public readonly significantFigures: number | undefined;
    /** The uncertainty/error/tolerance that this value has. Always in the base units (kg, m, s, etc.). */
    public get plusMinus(): number | undefined {
        return this._plusMinus;
    }
    protected _plusMinus: number | undefined;
    /**
     * For a few units like "degC", "degF", and "gauge Pascals", we need to keep track of their offset from
     * the base units. (e.g. 0C = 273.15K). This is ONLY used within getWithUnits() and this field does not
     * need to be preserved when cloning a Quantity or doing math with Quantities, because the offset is
     * already applied within the constructor, which converts everything to non-offset base units.
     */
    protected readonly _offsetUsed: number | undefined;
    /**
     * Units that were used when constructing or deriving this Quantity (if known), to use by default when serializing it.
     * The 'power' values of this are always ignored and may be omitted - only the prefixes and units are used.
     */
    protected _unitHintSet: ParsedUnit[] | undefined;

    constructor(
        protected _magnitude: number,
        options: {
            dimensions?: Dimensions;
            units?: string | ParsedUnit[];
            /**
             * If set, only this many of the decimal digits of the magnitude are significant.
             */
            significantFigures?: number;
            /** Allowed uncertainty/error/tolerance in this measurement. Must be using the same units as the magnitude. */
            plusMinus?: number;
            /** Internal use only - set the _unitHintSet on this newly constructed Quantity */
            [setUnitHintSet]?: ParsedUnit[];
        } = {},
    ) {
        this.significantFigures = options.significantFigures;
        this._plusMinus = options.plusMinus;
        if (options.units) {
            if (options.dimensions) {
                throw new QuantityError(`You can specify units or dimensions, but not both.`);
            }
            const units: ParsedUnit[] = typeof options.units === "string" ? parseUnits(options.units) : options.units;
            this._unitHintSet = units;
            this._dimensions = Dimensionless;
            for (const u of units) {
                const unitData = getUnitData(u.unit);
                const scale = u.prefix ? unitData.s * prefixes[u.prefix] : unitData.s;
                const unitQuantity = new Quantity(scale, { dimensions: unitData.d });
                unitQuantity._pow(u.power);
                this._multiply(unitQuantity);
                if (unitData.offset) {
                    if (units.length !== 1) {
                        throw new QuantityError(
                            `It is not permitted to use compound units that include the offset unit "${u}". Try using K, deltaC, or Pa instead.`,
                        );
                        // e.g. "50 °C per kilometer" doesn't make any sense, but "50 ΔC per kilometer" could make sense.
                    }
                    this._magnitude += unitData.offset;
                    // We need to track the offset for the getWithUnits() method to be able to do conversions properly.
                    this._offsetUsed = unitData.offset;
                }
            }
        } else if (options.dimensions) {
            this._dimensions = options.dimensions;
            this._unitHintSet = options[setUnitHintSet];
        } else {
            this._dimensions = Dimensionless;
        }
    }

    /** Is this dimensionless (a pure number with no units)? */
    public get isDimensionless(): boolean {
        return this.dimensions.isDimensionless;
    }

    /** Does this quantity have the same dimensions as that one? */
    public sameDimensionsAs(other: Quantity): boolean {
        return this.dimensions.equalTo(other.dimensions);
    }

    /** Is this Quantity exactly equal to another? */
    public equals(other: Quantity): boolean {
        return (
            this.sameDimensionsAs(other) &&
            this.magnitude === other.magnitude &&
            this.plusMinus === other.plusMinus &&
            this.significantFigures === other.significantFigures
        );
    }

    public static compare(a: Quantity, b: Quantity, ignoreUnits = false): 0 | 1 | -1 {
        if (!ignoreUnits) {
            if (!a._dimensions.equalTo(b._dimensions)) {
                throw new QuantityError(
                    "Cannot compare Quantities with different dimensions, unless using ignoreUnits=true.",
                );
            }
        }
        const diff = a.magnitude - b.magnitude;
        return diff === 0 ? 0 : diff > 0 ? 1 : -1;
    }

    toString(): string {
        const serialized = this.get();
        let r = serialized.significantFigures === undefined
            ? serialized.magnitude.toString(10)
            : serialized.magnitude.toPrecision(serialized.significantFigures);
        if (serialized.plusMinus) {
            let plusMinusString = serialized.plusMinus.toPrecision(2);
            for (let i = 0; i < plusMinusString.length; i++) {
                if (plusMinusString[i] === "0" || plusMinusString[i] === ".") {
                    continue;
                } else if (plusMinusString[i] === "1") {
                    // The uncertainty/error/tolerance starts with 1, so we follow
                    // an arbitrary rule to print it with two significant figures.
                    // See https://physics.stackexchange.com/a/520937 for why we do this.
                    break;
                } else {
                    // The uncertainty/error/tolerance should be printed to one
                    // significant figure, as it doesn't start with "1"
                    plusMinusString = serialized.plusMinus.toPrecision(1);
                }
            }
            if (!serialized.significantFigures) {
                // Also, we need to trim the magnitude so that it doesn't have any more decimal places than
                // the uncertainty/error/tolerance has. (Unless an explicit "significantFigures" value was given.)
                const countDecimalPlaces = (str: string) => str.includes(".") ? str.length - str.indexOf(".") + 1 : 0;
                const numPlusMinusDecimalPlaces = countDecimalPlaces(plusMinusString);
                let precision = r.length;
                while (countDecimalPlaces(r) > numPlusMinusDecimalPlaces) {
                    r = serialized.magnitude.toPrecision(--precision);
                }
            }
            r += "±" + plusMinusString;
        }
        if (serialized.units.length > 0) {
            r += " " + serialized.units;
        }
        return r;
    }

    /** Get the value of this (as a SerializedQuantity) using the specified units. */
    public getWithUnits(units: string | ParsedUnit[]): SerializedQuantity {
        const converter = new Quantity(1, { units });
        if (!converter.sameDimensionsAs(this)) {
            throw new QuantityError("Cannot convert units that aren't compatible.");
        }
        if (converter._offsetUsed) {
            // For units of C/F temperature or "gauge Pascals" that have an offset, undo that offset
            // so that the converter represents the unit quantity.
            converter._magnitude -= converter._offsetUsed;
        }
        const result: SerializedQuantity = {
            magnitude: (this._magnitude - (converter._offsetUsed ?? 0)) / converter._magnitude,
            units: typeof units === "string" ? units : toUnitString(units),
        };
        if (this.significantFigures) {
            result.significantFigures = this.significantFigures;
        }
        if (this.plusMinus) {
            result.plusMinus = this.plusMinus / converter.magnitude;
        }
        return result;
    }

    /** Get the details of this quantity, using the original unit representation if possible.  */
    public get(): SerializedQuantity {
        if (this._unitHintSet) {
            const unitsToUse = this.pickUnitsFromList(this._unitHintSet);
            return this.getWithUnits(unitsToUse);
        }
        // Fall back to SI units if we can't use the units in the "hint set".
        return this.getSI();
    }

    /** Get the most compact SI representation for this quantity.  */
    public getSI(): SerializedQuantity {
        const unitList = this.pickUnitsFromList([
            // Base units:
            { unit: "g", prefix: "k" },
            { unit: "m" },
            { unit: "s" },
            { unit: "K" },
            { unit: "A" },
            { unit: "mol" },
            // {unit: "cd"},
            { unit: "b" },
            // Derived units:
            { unit: "N" },
            { unit: "Pa" },
            { unit: "J" },
            { unit: "W" },
            { unit: "C" },
            { unit: "V" },
            { unit: "F" },
            { unit: "ohm" },
            { unit: "S" },
            { unit: "Wb" },
            { unit: "T" },
            { unit: "H" },
            // {unit: "lm"},
            // {unit: "lx"},
            // {unit: "Bq"},
            // {unit: "Gy"},
        ]);
        return this.getWithUnits(unitList);
    }

    /**
     * Internal method: given a list of possible units, pick the most compact subset
     * that can be used to represent this quantity.
     */
    protected pickUnitsFromList(unitList: Omit<ParsedUnit, "power">[]): ParsedUnit[] {
        // Convert unitList to a dimension Array
        const unitArray: Dimensions[] = unitList.map((u) => getUnitData(u.unit).d);
        // Loop through each dimension and create a list of unit list indexes that
        // are the best match for the dimension
        const useUnits: number[] = [];
        const useUnitsPower: number[] = [];
        let remainder = this._dimensions;
        while (remainder.dimensionality > 0) {
            let bestIdx = -1;
            let bestInv = 0;
            let bestRemainder = remainder;
            for (let unitIdx = 0; unitIdx < unitList.length; unitIdx++) {
                const unitDimensions = unitArray[unitIdx];
                for (let isInv = 1; isInv >= -1; isInv -= 2) {
                    const newRemainder = remainder.multiply(isInv === 1 ? unitDimensions.invert() : unitDimensions);
                    // If this unit reduces the dimensionality more than the best candidate unit yet found,
                    // or reduces the dimensionality by the same amount but is in the numerator rather than denominator:
                    if (
                        (newRemainder.dimensionality < bestRemainder.dimensionality) ||
                        (newRemainder.dimensionality === bestRemainder.dimensionality && isInv === 1 && bestInv === -1)
                    ) {
                        bestIdx = unitIdx;
                        bestInv = isInv;
                        bestRemainder = newRemainder;
                        break; // Tiny optimization: if this unit is better than bestRemainder, we don't need to check its inverse
                    }
                }
            }
            // Check to make sure that progress is being made towards remainder = 0
            // if no more progress is being made then the provided units don't span
            // this unit, throw an error.
            if (bestRemainder.dimensionality >= remainder.dimensionality) {
                throw new QuantityError(`Cannot represent this quantity with the supplied units`);
            }
            // Check if the new best unit already in the set of numerator or
            // denominator units. If it is, increase the power of that unit, if it
            // is not, then add it.
            const existingIdx = useUnits.indexOf(bestIdx);
            if (existingIdx == -1) {
                useUnits.push(bestIdx);
                useUnitsPower.push(bestInv);
            } else {
                useUnitsPower[existingIdx] += bestInv;
            }
            remainder = bestRemainder;
        }

        // Special case to handle dimensionless units like "%" that we may actually want to use:
        if (unitList.length === 1 && useUnits.length === 0) {
            // We want "50 % ⋅ 50 %" to give "25 %"
            // But we want "50 % ⋅ 400 g" to give "200 g" (not "20,000 g⋅%"!)
            for (let unitIdx = 0; unitIdx < unitList.length; unitIdx++) {
                if (unitArray[unitIdx].isDimensionless) {
                    useUnits.push(unitIdx);
                    useUnitsPower.push(1);
                    break; // Only include up to one dimensionless unit like "%"
                }
            }
        }

        // At this point the units to be used are in useUnits
        return useUnits.map((i, pi) => ({
            unit: unitList[i].unit,
            prefix: unitList[i].prefix,
            power: useUnitsPower[pi],
        }));
    }

    /**
     * Clone this Quantity. This is an internal method, because as far as the public API allows,
     * Quantity objects are immutable, so there is no need to use this API publicly.
     */
    protected _clone(): Quantity {
        return new Quantity(this._magnitude, {
            dimensions: this._dimensions,
            plusMinus: this._plusMinus,
            significantFigures: this.significantFigures,
            [setUnitHintSet]: this._unitHintSet,
        });
    }

    /**
     * Internal helper method: when doing a mathematical operation involving two Quantities, use this to combine their
     * "unit hints" so that the resulting Quantity object will "remember" the preferred unit for the result.
     */
    protected static combineUnitHints(
        h1: ParsedUnit[] | undefined,
        h2: ParsedUnit[] | undefined,
    ): ParsedUnit[] | undefined {
        const unitHintSet: ParsedUnit[] = [];
        for (const u of (h1 ?? []).concat(h2 ?? [])) {
            if (!unitHintSet.find((eu) => eu.unit === u.unit)) {
                unitHintSet.push(u);
            }
        }
        return unitHintSet.length ? unitHintSet : undefined;
    }

    /** Add this to another Quantity, returning the result as a new Quantity object */
    public add(y: Quantity): Quantity {
        if (!this._dimensions.equalTo(y._dimensions)) {
            throw new QuantityError(`Cannot add quanitites with different units.`);
        }

        let plusMinus = undefined;
        if (this._plusMinus || y._plusMinus) {
            // When adding two quantities, the values of the uncertainty/tolerance are simply added:
            plusMinus = (this._plusMinus ?? 0) + (y._plusMinus ?? 0);
        }

        const significantFigures: number | undefined = undefined;
        if (this.significantFigures || y.significantFigures) {
            // Rule for adding/subtracting with significant figures:
            // 1. Find the place position of the last significant digit in the least certain number
            // 2. Add and/or subtract the numbers as usual
            // 3. The final number of significant figures is the number of digits up to the place position found in step 1
            throw new QuantityError("Addition of significant figures is not yet implemented.");
        }

        return new Quantity(this._magnitude + y._magnitude, {
            dimensions: this._dimensions,
            plusMinus,
            significantFigures,
            // Preserve the "unit hints" so that the new Quantity will remember what units were used:
            [setUnitHintSet]: Quantity.combineUnitHints(this._unitHintSet, y._unitHintSet),
        });
    }

    /** Subtract another Quantity from this, returning the result as a new Quantity object */
    public sub(y: Quantity): Quantity {
        const tempQ = y._clone();
        tempQ._magnitude = 0 - tempQ._magnitude;
        return this.add(tempQ);
    }

    /** Modify this Quantity in-place by multiplying it with another quantity. */
    protected _multiply(y: Quantity) {
        // Multiply the dimensions:
        this._dimensions = this._dimensions.multiply(y.dimensions);

        // Multiply the error/tolerance/uncertainty:
        if (this._plusMinus === undefined) {
            if (y._plusMinus === undefined) {
                // No error/tolerance/uncertainty in either value.
            } else {
                // this has no error/tolerance/uncertainty, but the other value does.
                this._plusMinus = y._plusMinus * this._magnitude;
            }
        } else {
            if (y._plusMinus) {
                // When both values have error/tolerance/uncertainty, we need to add the *relative* values:
                this._plusMinus = ((this._plusMinus / this._magnitude) + (y._plusMinus / y._magnitude)) *
                    (this._magnitude * y._magnitude);
            } else {
                // this has error/tolerance/uncertainty, but the other value does not.
                this._plusMinus *= y._magnitude;
            }
        }

        if (this.significantFigures || y.significantFigures) {
            throw new QuantityError("Multiplication of significant figures is not yet implemented.");
        }

        // Multiply the magnitude:
        this._magnitude *= y._magnitude;
        // Add in the additional unit hints, if applicable:
        this._unitHintSet = Quantity.combineUnitHints(this._unitHintSet, y._unitHintSet);
    }

    /** Multiply this Quantity by another Quantity and return the new result */
    public multiply(y: Quantity): Quantity {
        const result = this._clone();
        result._multiply(y);
        return result;
    }

    /** Modify this Quantity in-place by raising it to the given power. */
    protected _pow(n: number) {
        if (n === 1) return;
        // Raise the dimensions to the given power. This also does a lot of error checking for us:
        this._dimensions = this._dimensions.pow(n);
        if (this._plusMinus) {
            // this has error/tolerance/uncertainty, so do the math for that:
            const relativeError = this._plusMinus / this._magnitude;
            this._plusMinus = relativeError * n;
        }
        this._magnitude = Math.pow(this._magnitude, n);
    }
}
