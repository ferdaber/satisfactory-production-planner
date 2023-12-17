import Fraction from "fractions";
import { FractionLike, createFraction } from "./fractions";

export type Matrix<T = number> = T[][];
export type Vec<T = number> = T[];

export function validateMatrix(matrix: Readonly<Matrix<any>>) {
    if (!matrix.every((row) => row.length === matrix[0].length)) {
        throw new Error(`Matrix is not of the form N x M`);
    }
}

export function printMatrix(matrix: Matrix<any>) {
    const strMatrix = matrix.map((row) =>
        row.map((col) => (Fraction.fromFraction(col) ? Fraction.toString(col) : String(col))),
    );
    const maxLengths = Array.from({ length: strMatrix[0].length }, (_, colIdx) =>
        Math.max(...strMatrix.map((row) => row[colIdx].length)),
    );
    return strMatrix.map((row) => row.map((col, colIdx) => col.padEnd(maxLengths[colIdx])).join(" ")).join("\n");
}

export function fractionalMatrixEquals(matrix1: Matrix<FractionLike>, matrix2: Matrix<FractionLike>) {
    return matrix1.every((row, rowIdx) =>
        row.every((col, colIdx) => createFraction(col).approxEquals(matrix2[rowIdx][colIdx])),
    );
}
