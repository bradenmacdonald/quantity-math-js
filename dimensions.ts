import { QuantityError } from "./error.ts";

/**
 * How many basic dimensions there are
 * (mass, length, time, temp, current, substance, luminosity, information)
 *
 * As opposed to custom dimensions, like "flurbs per bloop" which has two
 * custom dimensions (flurbs and bloops).
 */
const numBasicDimensions = 9;

// TODO: add an angle dimension, like Boost and Mathematica do.

/**
 * The dimensions of a Quantity value.
 * For example:
 * - `5 kg⋅m` has dimensions of 'mass' (from kg) and 'distance' (from m)
 * - `5 m^3` has dimensions of 'distance^3' (also known as volume)
 * - `15.03` is a dimensionless number (no units)
 *
 * Note that dimensions ignores unit details: `15 ft` and `-3 m` both have identical dimensions (distance).
 * All that this cares about is the *power* of the dimension, i.e. `m` vs. `m^2` vs. `m^-3`
 */
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
            angle: number,
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

    /** Is this dimensionless? (all dimensions are zero) */
    public get isDimensionless(): boolean {
        return this === Dimensionless || this.dimensions.every((d) => d === 0);
    }

    /** Private cache of the dimensionality, as a minor optimization */
    #cachedDimensionality: number | undefined;

    /** Get the dimensionality of this - the sum of the absolute values of all dimensions */
    public get dimensionality(): number {
        if (this.#cachedDimensionality === undefined) {
            this.#cachedDimensionality = this.dimensions.reduce<number>((sum, d) => sum + Math.abs(d ?? 0), 0);
        }
        return this.#cachedDimensionality;
    }

    private static combineCustomDimensionNames(x: Dimensions, y: Dimensions) {
        const customDimensionNames = [...x.customDimensionNames];
        for (const custDimName of y.customDimensionNames) {
            if (!customDimensionNames.includes(custDimName)) {
                customDimensionNames.push(custDimName);
            }
        }
        // Custom dimension names must always be sorted.
        customDimensionNames.sort();
        return customDimensionNames;
    }

    /**
     * Check if the dimensions of this are equal to the dimensions of another Dimensions object.
     * This will ignore any custom dimensions that are zero in one object but missing in the other,
     * as those are still compatible Dimensions objects.
     */
    public equalTo(other: Dimensions): boolean {
        for (let i = 0; i < numBasicDimensions; i++) {
            if (this.dimensions[i] !== other.dimensions[i]) {
                return false;
            }
        }
        if (this.customDimensionNames.length === 0 && other.customDimensionNames.length === 0) {
            // Normal case: no custom dimensions to worry about.
            return true;
        }
        // Complex case: make sure that the non-zero custom dimensions are the same.
        for (const name of Dimensions.combineCustomDimensionNames(this, other)) {
            const thisIdx = this.customDimensionNames.indexOf(name);
            const thisValue = thisIdx === -1 ? 0 : this.dimensions[numBasicDimensions + thisIdx];
            const otherIdx = other.customDimensionNames.indexOf(name);
            const otherValue = otherIdx === -1 ? 0 : other.dimensions[numBasicDimensions + otherIdx];
            if (thisValue !== otherValue) {
                return false;
            }
        }
        return true;
    }

    /** Multiply these dimensions by another dimensions */
    public multiply(y: Dimensions): Dimensions {
        if (this.customDimensionNames.length === 0 && y.customDimensionNames.length === 0) {
            // Normal case - no custom dimensions:
            const newDimArray = this.dimensions.map((d, i) => d! + y.dimensions[i]!);
            // deno-lint-ignore no-explicit-any
            return new Dimensions(newDimArray as any, []);
        } else {
            // We have to handle custom dimensions in one or both Dimensions objects.
            // They may have different custom dimensions or may be the same.
            const customDimensionNames = Dimensions.combineCustomDimensionNames(this, y);
            // Now we have the new set of custom dimension names.
            if (customDimensionNames.length > 4) {
                throw new QuantityError("Cannot have more than 4 custom dimensions.");
            }
            const newDimArray = new Array<number>(numBasicDimensions + customDimensionNames.length);
            // Multiply the basic dimensions:
            for (let i = 0; i < numBasicDimensions; i++) {
                newDimArray[i] = this.dimensions[i]! + y.dimensions[i]!;
            }
            // Multiply the custom dimensions:
            for (let i = 0; i < customDimensionNames.length; i++) {
                let dimValue = 0;
                const custDimName = customDimensionNames[i];
                const thisIdx = this.customDimensionNames.indexOf(custDimName);
                if (thisIdx !== -1) dimValue += this.dimensions[numBasicDimensions + thisIdx]!;
                const yIdx = y.customDimensionNames.indexOf(custDimName);
                if (yIdx !== -1) dimValue += y.dimensions[numBasicDimensions + yIdx]!;
                newDimArray[numBasicDimensions + i] = dimValue;
            }
            // deno-lint-ignore no-explicit-any
            return new Dimensions(newDimArray as any, customDimensionNames as any);
        }
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

    /** Use a nice string when logging this with Deno's console.log() etc. */
    [Symbol.for("Deno.customInspect")](): string {
        return "Dimensions" + this.toString();
    }

    /**
     * Print this Dimensions object as a string (mostly useful for debugging).
     *
     * Example:
     * ```ts
     * new Dimensions([0,2,4,6,8,0,0,0,-3]).toString();
     * // '[0,2,4,6,8,0,0,0,-3]'
     * ```
     *
     * Example with a custom 'foo' dimension:
     *
     * ```ts
     * new Dimensions([0,2,4,6,8,0,0,0,-3,7], ["foo"]).toString();
     * // '[0,2,4,6,8,0,0,0,-3,foo:7]'
     * ```
     */
    public toString(): string {
        let str = "[" + this.dimensions.slice(0, numBasicDimensions).toString();
        this.customDimensionNames.forEach((dimName, i) => {
            str += `,${dimName}:${this.dimensions[numBasicDimensions + i]}`;
        });
        return str + "]";
    }
}

/**
 * A pure number with no dimensions.
 *
 * (e.g. "percent" or "parts per million" are both dimensionless pseudo-units - they have
 * no mass, distance, time, or any other dimension inherent in the unit. Percent
 * is just the pure number "0.01" and "parts per million" is "0.000001")
 *
 * Likewise an SI expression like "1 μm/m" is dimensionless after simplification.
 */
export const Dimensionless: Dimensions = new Dimensions([0, 0, 0, 0, 0, 0, 0, 0, 0]);
