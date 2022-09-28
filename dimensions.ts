import { QuantityError } from "./error.ts";

/**
 * How many basic dimensions there are
 * (mass, length, time, temp, current, substance, luminosity, information)
 *
 * As opposed to custom dimensions, like "flurbs per bloop" which has two
 * custom dimensions (flurbs and bloops).
 */
const numBasicDimensions = 8;

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
        /**
         * Offset from nominal of the unit (only used for temperatures like "25°C" or "80°F") which
         * are offset from the base unit of Kelvins. Kelvins and *relative* temperatures like
         */
        public readonly offset: number = 0,
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
        return this === Dimensionless ||
            (this.dimensions.every((d) => d == 0) && this.offset == 0);
    }

    public equalTo(other: Dimensions): boolean {
        return (
            other.offset === this.offset &&
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
        // Special checks required for operations involving units with offsets (Celcius or Farenheit temps):
        if (this.offset !== 0) {
            if (y.offset !== 0) {
                throw new QuantityError(
                    `Cannot multiply two dimensions with an offset. If using temperatures consider using "deltaC" or "deltaF" instead.`,
                );
            } else if (!y.isDimensionless) {
                throw new QuantityError(
                    `Can only multiply quantities with an offset by a dimensionless quantity.`,
                );
            }
        }

        if (this.customDimensionNames.length || y.customDimensionNames.length) {
            throw new QuantityError(
                "Multiplying custom dimensions is not yet implemented",
            );
        }

        const newDimArray = this.dimensions.map((d, i) => d! + y.dimensions[i]!);
        // deno-lint-ignore no-explicit-any
        return new Dimensions(newDimArray as any, [], this.offset);
    }

    /** Raise these dimensions to a power */
    public pow(n: number): Dimensions {
        if (typeof n !== "number" || isNaN(n) || !Number.isInteger(n)) {
            throw new QuantityError(`Dimensions.pow(n): n must be an integer`);
        }
        if (n === 0) {
            return Dimensionless;
        }
        if (this.offset !== 0 && n > 1) {
            throw new QuantityError(
                `Cannot raise units with zero offsets to powers > 1`,
            );
        }
        const newDimArray = this.dimensions.map((d) => d! * n);
        return new Dimensions(
            // deno-lint-ignore no-explicit-any
            newDimArray as any,
            this.customDimensionNames,
            this.offset,
        );
    }
}

export const Dimensionless = new Dimensions([0, 0, 0, 0, 0, 0, 0, 0]);
