import { Dimensionless, Dimensions } from "./dimensions.ts";
import { QuantityError } from "./error.ts";
import { builtInUnits, parseUnits, prefixes } from "./units.ts";

export interface SerializedQuantity {
    magnitude: number;
    significantFigures?: number;
    plusMinus?: number;
    units: string;
}

export class Quantity {
    public get magnitude() {
        return this._magnitude;
    }
    protected _dimensions: Dimensions;
    public get dimensions() {
        return this._dimensions;
    }
    public readonly significantFigures: number | undefined;
    public get plusMinus() {
        return this._plusMinus;
    }
    protected _plusMinus: number | undefined;
    protected readonly _offsetUsed: number | undefined;

    constructor(
        protected _magnitude: number,
        options: {
            dimensions?: Dimensions;
            units?: string;
            /**
             * If set, only this many of the decimal digits of 'magnitude' are significant.
             */
            significantFigures?: number;
            /** Allowed tolerance or uncertainty in this measurement */
            plusMinus?: number;
        } = {},
    ) {
        this.significantFigures = options.significantFigures;
        this._plusMinus = options.plusMinus;
        if (options.units) {
            if (options.dimensions) {
                throw new QuantityError(`You can specify units or dimensions, but not both.`);
            }
            const units = parseUnits(options.units);
            this._dimensions = Dimensionless;
            for (const u of units) {
                const unitData = builtInUnits[u.unit as keyof typeof builtInUnits];
                const scale = u.prefix ? unitData.s * prefixes[u.prefix] : unitData.s;
                const unitQuantity = new Quantity(scale, { dimensions: unitData.d });
                unitQuantity._pow(u.power);
                this._multiply(unitQuantity);
                if ("offset" in unitData) {
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
    public equals(other: Quantity) {
        return (
            this.sameDimensionsAs(other) &&
            this.magnitude === other.magnitude &&
            this.plusMinus === other.plusMinus &&
            this.significantFigures === other.significantFigures
        );
    }

    toString(): string {
        let r = this.significantFigures === undefined
            ? this.magnitude.toString(10)
            : this.magnitude.toPrecision(this.significantFigures);
        if (this.plusMinus) {
            r += "±" + this.plusMinus.toString(10);
        }
        if (!this.isDimensionless) {
            // TODO: print the units as a string, separated by ⋅ or /
        }
        return r;
    }

    public getWithUnits(units: string): SerializedQuantity {
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
            units,
        };
        if (this.significantFigures) {
            result.significantFigures = this.significantFigures;
        }
        if (this.plusMinus) {
            result.plusMinus = this.plusMinus / converter.magnitude;
        }
        return result;
    }

    protected _clone(): Quantity {
        return new Quantity(this._magnitude, {
            dimensions: this._dimensions,
            plusMinus: this._plusMinus,
            significantFigures: this.significantFigures,
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
        });
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
