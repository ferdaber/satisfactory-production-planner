declare module "fractions" {
    export type FractionLike = Fraction | number | string;

    class Fraction {
        readonly numerator: number;
        readonly denominator: number;

        constructor(numerator: number, denominator: number): Fraction;
        constructor(fractionLike: number | string): Fraction;

        static add(frac1: FractionLike, frac2: FractionLike): Fraction;
        static subtract(frac1: FractionLike, frac2: FractionLike): Fraction;
        static multiply(frac1: FractionLike, frac2: FractionLike): Fraction;
        static divide(frac1: FractionLike, frac2: FractionLike): Fraction;
        static simplify(frac: FractionLike): Fraction;
        static greatestCommonDivisor(num1: number, num2: number): number;
        static toString(frac: Fraction): string;
        static equals(frac1: FractionLike, frac2: FractionLike): boolean;
        static valueOf(frac: FractionLike): number;
        static correctArgumentLength(ideal: number, actual: number): void;
        static change(oldFrac: Fraction, newFrac: Fraction): Fraction;
        static isString(s: unknown): s is string;
        static fromFraction(frac: unknown): frac is Fraction;
        static toFraction(frac: FractionLike): Fraction;
        static decimalToFraction(num: number): Fraction;

        multiply(frac: FractionLike): this;
        divide(frac: FractionLike): this;
        add(frac: FractionLike): this;
        subtract(frac: FractionLike): this;
        simplify(): this;
        toString(): string;
        equals(frac: FractionLike): boolean;
        approxEquals(frac: FractionLike): boolean;
        valueOf(): number;
        copy(): this;
        inverse(): this;
    }

    export default Fraction;
}
