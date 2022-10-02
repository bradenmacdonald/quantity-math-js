import { QuantityError } from "./error.ts";

/**
 * How many basic dimensions there are
 * (mass, length, time, temp, current, substance, luminosity, information)
 *
 * As opposed to custom dimensions, like "flurbs per bloop" which has two
 * custom dimensions (flurbs and bloops).
 */
const numBasicDimensions = 8;

// TODO: add an angle dimension, like Boost and Mathematica do.

export class Dimensions {
    constructor(
        public readonly dimensions: [
            mass: number,
            length: number,
            time: number,
            temperature: number,
            current: number,
            substance: number,
            luminosity: number,
            information: number,
            /**
             * Track custom dimensions.
             *
             * For special units like "passengers per hour per direction", "passengers" is a custom dimension, as is "direction"
             */
            custom1?: number,
            custom2?: number,
            custom3?: number,
            custom4?: number,
        ],
        public readonly customDimensionNames: [
            /** e.g. "fish", "passengers", "$USD", or whatever other custom unit dimension this is */
            custom1?: string,
            custom2?: string,
            custom3?: string,
            custom4?: string,
        ] = [],
    ) {
        if (dimensions.length < numBasicDimensions) {
            throw new QuantityError(
                "not enough dimensions specified for Quantity.",
            );
        }

        const numCustomDimensions = customDimensionNames.length;
        if (dimensions.length !== numBasicDimensions + numCustomDimensions) {
            throw new QuantityError(
                "If a Quantity includes custom dimensions, they must be named via customDimensionNames",
            );
        }

        if (customDimensionNames.length) {
            // Make sure customDimensionNames is sorted in alphabetical order, for consistency.
            // This also validated that there are no duplicate custom dimensions (["floop", "floop"])
            const isSorted = customDimensionNames.every((
                v,
                i,
                a,
            ) => (i === 0 || v! > a[i - 1]!));
            if (!isSorted) {
                throw new QuantityError(
                    "customDimensionNames is not sorted into the correct alphabetical order.",
                );
            }
        }
    }

    public get isDimensionless(): boolean {
        return this === Dimensionless || this.dimensions.every((d) => d == 0);
    }

    private _cachedDimensionality: number | undefined;

    /** Get the dimensionality of this - the sum of the absolute values of all dimensions */
    public get dimensionality(): number {
        if (this._cachedDimensionality === undefined) {
            this._cachedDimensionality = this.dimensions.reduce<number>((sum, d) => sum + Math.abs(d ?? 0), 0);
        }
        return this._cachedDimensionality;
    }

    public equalTo(other: Dimensions): boolean {
        return (
            this.dimensions.length === other.dimensions.length &&
            this.dimensions.every((d, i) => d === other.dimensions[i]) &&
            this.customDimensionNames.length ===
                other.customDimensionNames.length &&
            (
                this.customDimensionNames.every((cdn, i) => cdn === other.customDimensionNames?.[i])
            )
        );
    }

    /** Multiply these dimensions by another dimensions */
    public multiply(y: Dimensions): Dimensions {
        if (this.customDimensionNames.length || y.customDimensionNames.length) {
            throw new QuantityError(
                "Multiplying custom dimensions is not yet implemented",
            );
        }

        const newDimArray = this.dimensions.map((d, i) => d! + y.dimensions[i]!);
        // deno-lint-ignore no-explicit-any
        return new Dimensions(newDimArray as any, []);
    }

    /** Invert these dimensions, returning a new inverted Dimensions instance */
    public invert(): Dimensions {
        const newDimArray = this.dimensions.map((d) => d! * -1);
        // deno-lint-ignore no-explicit-any
        return new Dimensions(newDimArray as any, this.customDimensionNames);
    }

    /** Raise these dimensions to a power */
    public pow(n: number): Dimensions {
        if (typeof n !== "number" || isNaN(n) || !Number.isInteger(n)) {
            throw new QuantityError(`Dimensions.pow(n): n must be an integer`);
        }
        if (n === 0) {
            return Dimensionless;
        }
        const newDimArray = this.dimensions.map((d) => d! * n);
        return new Dimensions(
            // deno-lint-ignore no-explicit-any
            newDimArray as any,
            this.customDimensionNames,
        );
    }
}

export const Dimensionless = new Dimensions([0, 0, 0, 0, 0, 0, 0, 0]);
