import { Dimensionless, Dimensions } from "./dimensions.ts";

export class Quantity {
    public readonly dimensions: Dimensions;
    public readonly significantFigures: number | undefined;
    public readonly plusMinus: number | undefined;

    constructor(
        public readonly magnitude: number,
        options: {
            dimensions?: Dimensions;
            /**
             * If set, only this many of the decimal digits of 'magnitude' are significant.
             */
            significantFigures?: number;
            /** Allowed tolerance or uncertainty in this measurement */
            plusMinus?: number;
        } = {},
    ) {
        this.dimensions = options.dimensions ?? Dimensionless;
        this.significantFigures = options.significantFigures;
        this.plusMinus = options.plusMinus;
    }

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
}
