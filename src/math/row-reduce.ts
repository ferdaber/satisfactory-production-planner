import { Matrix, printMatrix, validateMatrix } from "./matrix";
import { FractionLike, Fraction } from "./fraction";

export function rref(numMatrix: Readonly<Matrix<FractionLike>>, debug = false): Matrix<Fraction> {
    validateMatrix(numMatrix);
    const matrix = numMatrix.map((row) => row.map((col) => new Fraction(col)));
    if (debug) {
        console.log(`Starting matrix`);
        console.log(printMatrix(matrix));
    }
    let rowIdx = 0,
        colIdx = 0;
    while (rowIdx < matrix.length && colIdx < matrix[0].length) {
        if (matrix[rowIdx][colIdx].equals(0)) {
            // find a cell that is non-zero below the test cell
            const nextNonZeroRowIdx = matrix.findIndex((row, idx) => idx > rowIdx && !row[colIdx].equals(0));
            if (nextNonZeroRowIdx === -1) {
                // all rows are zero, so we can consider it to be the pivot, continue to the right
                colIdx += 1;
            } else {
                // this is a non-zero row, so swap it and redo the reduction
                [matrix[rowIdx], matrix[nextNonZeroRowIdx]] = [matrix[nextNonZeroRowIdx], matrix[rowIdx]];
                if (debug) {
                    console.log(`Swapping`);
                    console.log(printMatrix(matrix));
                }
            }
        } else {
            if (!matrix[rowIdx][colIdx].equals(1)) {
                const inverse = matrix[rowIdx][colIdx].clone().inverse();
                matrix[rowIdx] = matrix[rowIdx].map((col) => col.multiply(inverse));
                if (debug) {
                    console.log(`Reducing row to 1`);
                    console.log(printMatrix(matrix));
                }
            }

            for (let thisRowIdx = 0; thisRowIdx < matrix.length; thisRowIdx++) {
                if (thisRowIdx === rowIdx || matrix[thisRowIdx][colIdx].equals(0)) {
                    continue;
                } else {
                    // a - b*(a/b) = 0
                    const inverseScalar = matrix[thisRowIdx][colIdx].clone().divide(matrix[rowIdx][colIdx]);
                    matrix[thisRowIdx] = matrix[thisRowIdx].map((col, thisColIdx) =>
                        col.subtract(matrix[rowIdx][thisColIdx].clone().multiply(inverseScalar)),
                    );
                    if (debug) {
                        console.log(`Subtracting pivot row into another row`);
                        console.log(printMatrix(matrix));
                    }
                }
            }

            rowIdx++;
            colIdx++;
        }
    }

    return matrix;
}
