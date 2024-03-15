import { Dimensionless, Dimensions } from "./dimensions.ts";
import { InvalidConversionError, QuantityError } from "./error.ts";
import { baseSIUnits, getUnitData, ParsedUnit, parseUnits, PreferredUnit, prefixes, toUnitString } from "./units.ts";

/**
 * Simple data structure that holds all the key data of a Quantity instance.
 *
 * Suitable for JSON serialization.
 */
export interface SerializedQuantity {
    magnitude: number;
    significantFigures?: number;
    plusMinus?: number;
    units: string;
}

/** Private constructor parameter to pass '_unitOutput' values. */
const setUnitOutput = Symbol("setUnitOutput");

/**
 * Quantity - a value with dimensions (units)
 * e.g. `4`, `5 m`, `-32.1 kg⋅m/s^2`
 *
 * ```ts
 * const force = new Quantity(10, {units: "N"});
 * const distance = new Quantity(5, {units: "m"});
 * force.multiply(distance).toString(); // "50 N⋅m"
 * force.multiply(distance).getSI(); // { magnitude: 50, units: "J" }
 * ```
 *
 * See also the {@link Q} syntactic sugar:
 *
 * ```ts
 * Q`10 N`.multiply(Q`5 m`).getSI(); // { magnitude: 50, units: "J" }
 * Q`10 m`.add(Q`5 cm`).toString(); // "10.05 m"
 * ```
 */
export class Quantity {
    /** The magnitude (numeric part) of this Quantity value. Always in the base units (kg, m, s, etc.). */
    public get magnitude(): number {
        return this._magnitude;
    }

    /**
     * The dimensions of this Quantity value.
     * For example:
     * - `5 kg⋅m` has dimensions of 'mass' (from kg) and 'distance' (from m)
     * - `5 m³` has dimensions of 'distance³' (also known as volume)
     * - `15.03` is a dimensionless number (no units)
     *
     * Note that dimensions ignores unit details: `15 ft` and `-3 m` both have identical dimensions (distance).
     */
    public get dimensions(): Dimensions {
        return this._dimensions;
    }
    protected _dimensions: Dimensions;

    /** If set, only this many of the decimal digits of the magnitude are significant. */
    public readonly significantFigures: number | undefined;

    /** The uncertainty/error/tolerance that this value has. Always in the base units (kg, m, s, etc.). */
    public get plusMinus(): number | undefined {
        return this._plusMinus;
    }
    protected _plusMinus: number | undefined;

    /**
     * For a few units like "degC", "degF", and "gauge Pascals", we need to keep track of their offset from
     * the base units. (e.g. 0C = 273.15K). This is ONLY used within `get()` and this field does not
     * need to be preserved when cloning a Quantity or doing math with Quantities, because the offset is
     * already applied within the constructor, which converts everything to non-offset base units.
     */
    protected readonly _offsetUsed: number | undefined;
    /**
     * Units to use instead of the base units, when displaying this value.
     */
    protected readonly _unitOutput: readonly ParsedUnit[] | undefined;

    constructor(
        protected _magnitude: number,
        options: {
            dimensions?: Dimensions;
            units?: string | readonly ParsedUnit[];
            /**
             * If set, only this many of the decimal digits of the magnitude are significant.
             */
            significantFigures?: number;
            /** Allowed uncertainty/error/tolerance in this measurement. Must be using the same units as the magnitude. */
            plusMinus?: number;
            /** Internal use only - set the _unitOutput on this newly constructed Quantity */
            [setUnitOutput]?: readonly ParsedUnit[];
        } = {},
    ) {
        this.significantFigures = options.significantFigures;
        this._plusMinus = options.plusMinus;
        if (options.units) {
            if (options.dimensions) {
                throw new QuantityError(`You can specify units or dimensions, but not both.`);
            }
            const units: readonly ParsedUnit[] = typeof options.units === "string"
                ? parseUnits(options.units)
                : options.units;
            this._unitOutput = units;
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
                    // We need to track the offset for the get() method to be able to do conversions properly.
                    this._offsetUsed = unitData.offset;
                }
            }
        } else if (options.dimensions) {
            this._dimensions = options.dimensions;
            this._unitOutput = options[setUnitOutput];
            // Normalize the _unitOutput value to never be an empty array:
            if (this._unitOutput?.length === 0) this._unitOutput = undefined;
        } else {
            this._dimensions = Dimensionless;
        }
    }

    /**
     * Is this dimensionless (a pure number with no units)?
     *
     * ```ts
     * new Quantity(15).isDimensionless // true
     * new Quantity(15, {units: "m"}).isDimensionless // false
     * ```
     */
    public get isDimensionless(): boolean {
        return this.dimensions.isDimensionless;
    }

    /**
     * Does this quantity have the same dimensions as that one?
     *
     * ```ts
     * Q`10m`.sameDimensionsAs(Q`300 ft`)  // true (both distance)
     * Q`10m`.sameDimensionsAs(Q`300 kg`)  // false (distance vs mass)
     * Q`10m`.sameDimensionsAs(Q`10 m^2`)  // false (distance vs area)
     * Q`30 N⋅m`.sameDimensionsAs(Q`-1 J`)  // true (both work)
     * ```
     */
    public sameDimensionsAs(other: Quantity): boolean {
        return this.dimensions.equalTo(other.dimensions);
    }

    /**
     * Is this Quantity exactly equal to another?
     *
     * ```ts
     * Q`15 m`.equals(Q`15m`)  // true
     * Q`10 J`.equals(Q`10 N m`)  // true
     * Q`10 J`.equals(Q`5 J`)  // false
     * ```
     */
    public equals(other: Quantity): boolean {
        return (
            this.sameDimensionsAs(other) &&
            this.magnitude === other.magnitude &&
            this.plusMinus === other.plusMinus &&
            this.significantFigures === other.significantFigures
        );
    }

    /**
     * Compare two Quantity values (that have the same dimensions)
     *
     * ```ts
     * [Q`5m`, Q`1 ft`, Q`3 mi`, Q`20 mm`].toSorted(Quantity.compare).map(q => q.toString())
     * // [ "20 mm", "1 ft", "5 m", "3 mi" ]
     * ```
     *
     * If you really need to, you can pass `ignoreUnits = true` to compare the magnitudes only.
     */
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

    /**
     * Get this Quantity value as a standardized string.
     *
     * ```ts
     * new Quantity(15, {units: "kg m s^-2"}).toString()  // "15 kg⋅m/s^2"
     * ```
     */
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
    /**
     * Convert this Quantity to a different (compatible) unit.
     *
     * Example: convert 10kg to pounds (approx 22 lb)
     * ```ts
     * new Quantity(10, {units: "kg"}).convert("lb")  // Quantity(22.046..., { units: "lb" })
     * ```
     */
    public convert(units: string | ParsedUnit[]): Quantity {
        const unitsNormalized: ParsedUnit[] = typeof units == "string" ? (units ? parseUnits(units) : []) : units;
        // First do some validation:
        let dimensions = Dimensionless;
        for (const u of unitsNormalized) {
            dimensions = dimensions.multiply(getUnitData(u.unit).d.pow(u.power));
        }
        if (!this._dimensions.equalTo(dimensions)) {
            throw new InvalidConversionError();
        }
        return this._clone({ newUnitOutput: unitsNormalized });
    }

    /**
     * Get the value of this (as a SerializedQuantity) using the specified units.
     *
     * Example: convert 10kg to pounds (approx 22 lb)
     * ```ts
     * new Quantity(10, {units: "kg"}).getWithUnits("lb")  // { magnitude: 22.046..., units: "lb" }
     * ```
     *
     * @deprecated Use `.convert(units).get()` instead
     */
    public getWithUnits(units: string | ParsedUnit[]): SerializedQuantity {
        const result = this.convert(units).get();
        // getWithUnits() always returned the unit string as passed in, un-normalized:
        result.units = typeof units === "string" ? units : toUnitString(units);
        return result;
    }

    /**
     * Get the details of this quantity, using the original unit representation if possible.
     *
     * ```ts
     * new Quantity(10, {units: "N m"}).get()  // { magnitude: 10, units: "N⋅m" }
     * new Quantity(10, {units: "ft"}).get()  // { magnitude: 10, units: "ft" }
     * ```
     */
    public get(): SerializedQuantity {
        const unitsForResult: readonly ParsedUnit[] = this._unitOutput ?? this.pickUnitsFromList(baseSIUnits);
        const converter = new Quantity(1, { units: unitsForResult });

        if (converter._offsetUsed) {
            // For units of C/F temperature or "gauge Pascals" that have an offset, undo that offset
            // so that the converter represents the unit quantity.
            converter._magnitude -= converter._offsetUsed;
        }
        const result: SerializedQuantity = {
            magnitude: (this._magnitude - (converter._offsetUsed ?? 0)) / converter._magnitude,
            units: toUnitString(unitsForResult),
        };
        if (this.significantFigures) {
            // TODO: remove this
            result.significantFigures = this.significantFigures;
        }
        if (this.plusMinus) {
            result.plusMinus = this.plusMinus / converter.magnitude;
        }
        return result;
    }

    /**
     * Get the most compact SI representation for this quantity.
     *
     * ```ts
     * new Quantity(10, {units: "N m"}).getSI()  // { magnitude: 10, units: "J" }
     * new Quantity(10, {units: "ft"}).getSI()  // { magnitude: 3.048, units: "m" }
     * ```
     */
    public getSI(): SerializedQuantity {
        return this.toSI().get();
    }

    /**
     * Ensure that this Quantity is using SI units, with the most compact
     * representation possible.
     *
     * ```ts
     * new Quantity(10, {units: "ft"}).toSI().toString() // "3.048 m"
     * new Quantity(10, {units: "N m"}).toString()  // "10 N⋅m"
     * new Quantity(10, {units: "N m"}).toSI().toString()  // "10 J"
     * ```
     */
    public toSI(): Quantity {
        if (this._unitOutput) {
            return this._clone({ newUnitOutput: undefined });
        }
        return this;
    }

    /**
     * Internal method: given a list of possible units, pick the most compact subset
     * that can be used to represent this quantity.
     */
    protected pickUnitsFromList(unitList: readonly PreferredUnit[]): ParsedUnit[] {
        // Convert unitList to a dimension Array
        const unitArray: Dimensions[] = unitList.map((u) => getUnitData(u.unit).d);
        // Loop through each dimension and create a list of unit list indexes that
        // are the best match for the dimension
        const { useUnits, useUnitsPower } = this.pickUnitsFromListIterativeReduction(unitArray);

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
     * Internal method: given a list of possible units, pick the most compact subset
     * that can be used to represent this quantity.
     *
     * This algorithm doesn't always succeed (e.g. it can't pick "C/s" from [C, s] to
     * represent A - amperes), but it will work if given a good basis set (e.g. the
     * SI base units), and it does produce an optimal result in most cases.
     *
     * For challenging cases like picking Coulombs per second to represent 1 Ampere,
     * from a list of units that has [Coulombs, seconds] only, it's necessary to
     * use a different algorithm, like expressing the problem as a set of linear
     * equations and using Gauss–Jordan elimination to solve for the coefficients.
     */
    protected pickUnitsFromListIterativeReduction(
        unitArray: Dimensions[],
    ): { useUnits: number[]; useUnitsPower: number[] } {
        // Loop through each dimension and create a list of unit list indexes that
        // are the best match for the dimension
        const useUnits: number[] = [];
        const useUnitsPower: number[] = [];
        let remainder = this._dimensions;
        while (remainder.dimensionality > 0) {
            let bestIdx = -1;
            let bestInv = 0;
            let bestRemainder = remainder;
            unitsLoop:
            for (let unitIdx = 0; unitIdx < unitArray.length; unitIdx++) {
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
                        // If we've matched all the dimensions, there's no need to check more units.
                        if (newRemainder.isDimensionless && isInv === 1) break unitsLoop;
                        // Otherwise, if this unit is better than bestRemainder, we don't need to check its inverse
                        break;
                    }
                }
            }
            // Check to make sure that progress is being made towards remainder = 0
            // If no more progress is being made then we won't be able to find a compatible unit set from this list.
            if (bestRemainder.dimensionality >= remainder.dimensionality) {
                throw new InvalidConversionError();
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

        return { useUnits, useUnitsPower };
    }

    /**
     * Clone this Quantity. This is an internal method, because as far as the public API allows,
     * Quantity objects are immutable, so there is no need to use this API publicly.
     */
    protected _clone(options: { newUnitOutput?: readonly ParsedUnit[] | undefined } = {}): Quantity {
        return new Quantity(this._magnitude, {
            dimensions: this._dimensions,
            plusMinus: this._plusMinus,
            significantFigures: this.significantFigures,
            [setUnitOutput]: "newUnitOutput" in options ? options.newUnitOutput : this._unitOutput,
        });
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
            // Preserve the output units, so that the new Quantity will remember what units were requested:
            [setUnitOutput]: this._unitOutput,
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

        // This internal version of _multiply() doesn't change _unitOutput, but the
        // public version will adjust it when needed.
    }

    /** Multiply this Quantity by another Quantity and return the new result */
    public multiply(y: Quantity): Quantity {
        // Figure out what preferred unit should be used for the new Quantity, if relevant:
        let newUnitOutput: readonly ParsedUnit[] | undefined = undefined;
        if (this._unitOutput && y._unitOutput) {
            const xUnits = this._unitOutput.map((u) => ({ ...u, ...getUnitData(u.unit) }));
            const yUnits = y._unitOutput.map((u) => ({ ...u, ...getUnitData(u.unit) }));
            if (xUnits.length === 1 && xUnits[0].d.isDimensionless) {
                newUnitOutput = y._unitOutput;
            } else if (yUnits.length === 1 && yUnits[0].d.isDimensionless) {
                newUnitOutput = this._unitOutput;
            } else {
                // modify xUnits by combining yUnits into it
                for (const u of yUnits) {
                    const xEntry = xUnits.find((x) => x.d.equalTo(u.d));
                    if (xEntry !== undefined) {
                        xEntry.power += u.power;
                    } else {
                        xUnits.push(u);
                    }
                }
                newUnitOutput = xUnits.filter((u) => u.power !== 0).map((x) => ({
                    unit: x.unit,
                    power: x.power,
                    prefix: x.prefix,
                }));
            }
        } else {
            newUnitOutput = this._unitOutput ?? y._unitOutput;
        }
        // Do the actual multiplication of the magnitude and dimensions:
        const result = this._clone({ newUnitOutput });
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
