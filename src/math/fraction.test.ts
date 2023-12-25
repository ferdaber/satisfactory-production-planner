import { Fraction } from "./fraction";

describe("Construction", () => {
    test("new Fraction()", () => {
        expect(new Fraction()).toMatchObject({ numerator: 0, denominator: 1 });
    });
    test("new Fraction(3, 5)", () => {
        expect(new Fraction(3, 5)).toMatchObject({ numerator: 3, denominator: 5 });
    });
    test("new Fraction({ numerator: 5, denominator: 3 })", () => {
        expect(new Fraction({ numerator: 5, denominator: 3 })).toMatchObject({ numerator: 5, denominator: 3 });
    });
    test("new Fraction(3 / 4)", () => {
        expect(new Fraction(3 / 4)).toMatchObject({ numerator: 3, denominator: 4 });
    });
    test('new Fraction("3/9")', () => {
        expect(new Fraction("3/9")).toMatchObject({ numerator: 1, denominator: 3 });
    });
});

describe("Simplification", () => {
    test(`new Fraction(1, 2)`, () => {
        expect(new Fraction(1, 2).decimal).toEqual(0.5);
    });
    test(`new Fraction(4, 4)`, () => {
        expect(new Fraction(4, 4).decimal).toEqual(1);
    });
    test(`new Fraction("1/10")`, () => {
        expect(new Fraction("1/10").decimal).toEqual(0.1);
    });
    test(`new Fraction(4)`, () => {
        expect(new Fraction(4).decimal).toEqual(4);
    });
    test(`new Fraction(10, 5)`, () => {
        expect(new Fraction(10, 5).decimal).toEqual(2);
    });
    test(`new Fraction(1 / 5)`, () => {
        expect(new Fraction(1 / 5).decimal).toEqual(0.2);
    });
    test(`new Fraction(0, 333)`, () => {
        expect(new Fraction(0, 333).decimal).toEqual(0);
        expect(new Fraction(0, 333)).toMatchObject({ numerator: 0, denominator: 1 });
    });
    test(`new Fraction(1, -2)`, () => {
        expect(new Fraction(1, -2).decimal).toEqual(-0.5);
        expect(new Fraction(1, -2)).toMatchObject({ numerator: -1, denominator: 2 });
    });
});

describe("Addition", () => {
    test.each([
        ["2/12", "4/6", "5/6"],
        ["4/8 ", "1/4", "3/4"],
        ["2/10", "2/5", "3/5"],
        ["3/6 ", "2/12", "2/3"],
    ])("%s + %s", (a, b, expected) => {
        expect(new Fraction(a).add(b).toString()).toBe(expected);
    });
});

describe("Subtraction", () => {
    test.each([
        ["4/8 ", "1/4 ", "1/4"],
        ["7/12", "3/6 ", "1/12"],
        ["5/12", "1/6 ", "1/4"],
        ["1/2 ", "1/3 ", "1/6"],
        ["1/6 ", "5/12", "-1/4"],
    ])("%s - %s", (a, b, expected) => {
        expect(new Fraction(a).subtract(b).toString()).toBe(expected);
    });
});

describe("Multiplication", () => {
    test.each([
        ["0.9 ", "5/18", "1/4"],
        ["2/3 ", "9   ", "6"],
        ["6/15", "6/7 ", "12/35"],
        ["14/3", "3/4 ", "7/2"],
    ])("%s * %s", (a, b, expected) => {
        expect(new Fraction(a).multiply(b).toString()).toBe(expected);
    });
});

describe("Division", () => {
    test.each([
        ["2/3", "7/8", "16/21"],
        ["5/9", "105/36", "4/21"],
        ["5/12", "9/4", "5/27"],
        ["19", "38/6", "3"],
    ])("%s / %s", (a, b, expected) => {
        expect(new Fraction(a).divide(b).toString()).toBe(expected);
    });
});
