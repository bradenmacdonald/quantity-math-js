/** Base class for all errors thrown by quantity-math-js */
export class QuantityError extends Error {}

/**
 * The requested conversion is not possible/valid.
 *
 * e.g. converting meters to seconds.
 */
export class InvalidConversionError extends QuantityError {
    constructor() {
        super("Cannot convert units that aren't compatible.");
    }
}
