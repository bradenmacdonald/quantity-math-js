import { Dimensionless, Dimensions } from "./dimensions.ts";
import { QuantityError } from "./error.ts";
import { builtInUnits, parseUnits, prefixes } from "./units.ts";

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
                this._plusMinus = ((this._plusMinus / this._magnitude) +
                    (y._plusMinus / y._magnitude)) *
                    (this._magnitude * y._magnitude);
            } else {
                // this has error/tolerance/uncertainty, but the other value does not.
                this._plusMinus *= y._magnitude;
            }
        }

        // Multiply the magnitude:
        this._magnitude *= y._magnitude;
    }

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
