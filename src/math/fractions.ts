import Fraction, { type FractionLike } from "fractions";

export function createFraction(fraction: FractionLike) {
    return Fraction.fromFraction(fraction) ? fraction.copy() : new Fraction(fraction);
}

Fraction.prototype.copy = function copy() {
    return new Fraction(this.numerator, this.denominator);
};

Fraction.prototype.inverse = function inverse() {
    return Fraction.change(this, new Fraction(this.denominator, this.numerator));
};

Fraction.prototype.toString = function toString() {
    return Fraction.toString(this);
};

const EPS = 1e-4;
Fraction.prototype.approxEquals = function approxEquals(num: FractionLike) {
    return this.equals(num) || Math.abs(this.valueOf() - createFraction(num).valueOf()) <= EPS;
};

const prevSimplify = Fraction.simplify;
Fraction.simplify = function simplify(frac) {
    frac = prevSimplify(frac);
    if (frac.numerator === 0) {
        (frac.denominator as number) = 1;
    }
    if (Math.sign(frac.denominator) === -1) {
        (frac.numerator as number) = frac.numerator * -1;
        (frac.denominator as number) = frac.denominator * -1;
    }
    return frac;
};

export { Fraction, type FractionLike };
