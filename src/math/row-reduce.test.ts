import { fractionalMatrixEquals } from "./matrix";
import { rref } from "./row-reduce";

test("Matrix 1", () => {
    const matrix = [
        [0, 0, 1, -1, -2],
        [2, -4, -2, 4, 18],
        [-1, 2, 3, -5, -16],
    ];
    const expected = [
        [1, -2, 0, 0, 4],
        [0, 0, 1, 0, 1],
        [0, 0, 0, 1, 3],
    ];
    expect(fractionalMatrixEquals(rref(matrix), expected)).toBe(true);
});

test("Matrix 2", () => {
    const matrix = [
        [1, 2, 3, 6],
        [2, -3, 2, 14],
        [3, 1, -1, -2],
    ];
    const expected = [
        [1, 0, 0, 1],
        [0, 1, 0, -2],
        [0, 0, 1, 3],
    ];
    expect(fractionalMatrixEquals(rref(matrix), expected)).toBe(true);
});

test("Matrix 3", () => {
    const matrix = [
        [1, 1, 2],
        [3, 4, 5],
        [4, 5, 9],
    ];
    const expected = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
    ];
    expect(fractionalMatrixEquals(rref(matrix), expected)).toBe(true);
});
