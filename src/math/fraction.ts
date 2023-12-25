import { assert, assertNever, assertNumber, isObject } from "../utils";

export interface IFraction {
    readonly numerator: number;
    readonly denominator: number;
}

export type FractionLike = IFraction | number | string | [numerator: number, denominator: number];

export class Fraction implements IFraction {
    #numerator = 0;
    #denominator = 1;

    static #precision = 1e-5;
    static set precision(n: number) {
        assert(n > 0 && n < 1, `Fraction precision to be between 0 and 1, exclusive`);
        Fraction.#precision = n;
    }
    static get precision() {
        return Fraction.#precision;
    }

    constructor();
    constructor(numerator: number, denominator: number);
    constructor(fraction: IFraction);
    constructor(decimal: number);
    constructor(fraction: string);
    constructor(fraction: [numerator: number, denominator: number]);
    constructor(fraction: FractionLike);
    constructor(...args: readonly FractionLike[]) {
        if (args.length >= 2) {
            const [numerator, denominator] = args;
            assertNumber(numerator, "First argument of fraction");
            assertNumber(denominator, "Second argument of fraction");
            this.#numerator = numerator;
            this.#denominator = denominator;
        } else if (args.length === 1) {
            const arg = args[0];
            if (typeof arg === "string") {
                const divideIdx = arg.indexOf("/");
                if (divideIdx > -1) {
                    const numerator = Number.parseFloat(arg.substring(0, divideIdx).trim());
                    const denominator = Number.parseFloat(arg.substring(divideIdx + 1).trim());
                    assertNumber(numerator, `String argument to the left of '/' of fraction`);
                    assertNumber(denominator, `String argument to the right of '/' of fraction`);
                    this.#numerator = numerator;
                    this.#denominator = denominator;
                } else {
                    const numerator = Number.parseFloat(arg);
                    assertNumber(numerator, `String argument of fraction`);
                    this.#numerator = numerator;
                }
            } else if (typeof arg === "number") {
                assertNumber(arg, `Number argument of fraction`);
                this.#numerator = arg;
            } else if (isObject(arg)) {
                let numerator, denominator;
                if ("numerator" in arg && "denominator" in arg) {
                    ({ numerator, denominator } = arg);
                } else if (Array.isArray(arg)) {
                    [numerator, denominator] = arg;
                }
                assertNumber(numerator, `"numerator" property of fraction argument`);
                assertNumber(denominator, `"denominator" peroperty of fraction argument`);
                this.#numerator = numerator;
                this.#denominator = denominator;
            } else {
                assertNever(`Single argument of fraction to be type "string", "number", or another fraction`);
            }
        }
        if (!Number.isInteger(this.#numerator)) {
            const { numerator, denominator } = Fraction.#decimalToFraction(this.#numerator);
            this.#numerator = numerator;
            this.#denominator = denominator * this.#denominator;
        }
        if (!Number.isInteger(this.#denominator)) {
            const { numerator, denominator } = Fraction.#decimalToFraction(this.#denominator);
            this.#numerator = this.#numerator * denominator;
            this.#denominator = numerator;
        }
        this.#simplify();
    }

    get numerator() {
        return this.#numerator;
    }

    get denominator() {
        return this.#denominator;
    }

    get decimal() {
        return this.#numerator / this.#denominator;
    }

    valueOf() {
        return this.decimal;
    }

    toString() {
        if (this.#denominator !== 1) {
            return `${this.#numerator}/${this.#denominator}`;
        } else {
            return this.#numerator.toString();
        }
    }

    add(n: FractionLike): this {
        const { numerator, denominator } = new Fraction(n);
        const lcm = this.#denominator * (denominator / Fraction.#greatestCommonDivisor(this.#denominator, denominator));
        this.#numerator = this.#numerator * (lcm / this.#denominator) + numerator * (lcm / denominator);
        this.#denominator = lcm;
        this.#simplify();
        return this;
    }
    subtract(n: FractionLike): this {
        const { numerator, denominator } = new Fraction(n);
        const lcm = this.#denominator * (denominator / Fraction.#greatestCommonDivisor(this.#denominator, denominator));
        this.#numerator = this.#numerator * (lcm / this.#denominator) - numerator * (lcm / denominator);
        this.#denominator = lcm;
        this.#simplify();
        return this;
    }
    multiply(n: FractionLike): this {
        const { numerator, denominator } = new Fraction(n);
        this.#numerator *= numerator;
        this.#denominator *= denominator;
        this.#simplify();
        return this;
    }
    divide(n: FractionLike): this {
        const { numerator, denominator } = new Fraction(n);
        this.#numerator *= denominator;
        this.#denominator *= numerator;
        this.#simplify();
        return this;
    }

    equals(n: FractionLike) {
        return Math.abs(this.decimal - new Fraction(n).decimal) <= Fraction.precision;
    }

    inverse() {
        [this.#numerator, this.#denominator] = [this.#denominator, this.#numerator];
        this.#simplify();
        return this;
    }

    negate() {
        this.#numerator *= -1;
        return this;
    }

    clone() {
        return new Fraction(this);
    }

    #simplify() {
        if (this.#denominator < 0) {
            this.#numerator *= -1;
            this.#denominator *= -1;
        }
        if (this.#numerator === 0) {
            this.#denominator = 1;
        }
        const gcd = Fraction.#greatestCommonDivisor(this.#numerator, this.#denominator);
        this.#numerator /= gcd;
        this.#denominator /= gcd;
        assert(this.#denominator !== 0, `Denominator of fraction is non-zero`);
    }

    static #greatestCommonDivisor(a: number, b: number) {
        // get the GCD via Euclidean algorithm
        a = Math.abs(a);
        b = Math.abs(b);
        let greater = Math.max(a, b),
            lesser = Math.min(a, b);
        while (lesser) {
            [greater, lesser] = [lesser, greater % lesser];
        }
        return greater;
    }

    // converts a decimal-like to a number
    static #decimalToFraction(n: number): IFraction {
        let remainingPrecision = Fraction.#precision,
            denominator = 1,
            numerator = n;
        while (!Number.isInteger(numerator) && remainingPrecision < 1) {
            numerator *= 10;
            denominator *= 10;
            remainingPrecision *= 10;
        }
        if (!Number.isInteger(numerator)) {
            numerator = Number.parseInt(String(numerator));
        }
        return { numerator, denominator };
    }
}

export default Fraction;
