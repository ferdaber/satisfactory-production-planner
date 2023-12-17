import { getItemById, getRecipesByOutputId } from "./data/db";
import { FractionLike, Fraction } from "./math/fractions";
import { Matrix } from "./math/matrix";
import { rref } from "./math/row-reduce";
import { Item } from "./types/item";
import { Recipe, RecipeInput, RecipeOutput } from "./types/recipe";

interface LinkedRecipe {
    recipe: Recipe;
    matrixCoefficientColumnIdx: number;
    solution: string;
    inputs: {
        input: RecipeInput;
        linkedRecipe: LinkedRecipe | null;
        matrixCoefficientColumnIdx: number;
        solution: string;
    }[];
    outputs: {
        output: RecipeOutput;
        linkedRecipe: LinkedRecipe | null;
        matrixCoefficientColumnIdx: number;
        solution: string;
    }[];
}

function buildRow<T extends FractionLike>(rowLength: number, rowValues: Record<number, T>): T[] {
    const row: FractionLike[] = Array(rowLength).fill(0);
    for (const colIdxStr in rowValues) {
        let colIdx = Number.parseInt(colIdxStr);
        if (colIdx < 0) {
            colIdx = rowLength + colIdx;
        }
        row[colIdx] = rowValues[colIdxStr];
    }
    return row as T[];
}

export function solveProduction(outputItemId: string, throughput: number, debug = false) {
    const outputItem = getItemById(outputItemId);
    const linkedRecipes: LinkedRecipe[] = [];

    let colIdx = 0;
    function resolveItemOutputRecipe(desiredItem: Item, linkedOutputRecipe: LinkedRecipe | null) {
        const matchingRecipes = getRecipesByOutputId(desiredItem.id);
        const primaryRecipes = matchingRecipes.filter((recipe) => !recipe.isAlternate && !recipe.isManual);
        if (primaryRecipes.length !== 1) {
            debugger;
        }
        const recipe = primaryRecipes[0];

        const linkedRecipe: LinkedRecipe = {
            recipe,
            matrixCoefficientColumnIdx: colIdx++,
            solution: "",
            outputs: recipe.outputs.map((output): LinkedRecipe["outputs"][number] => {
                return {
                    output,
                    linkedRecipe: null,
                    matrixCoefficientColumnIdx: colIdx++,
                    solution: "",
                };
            }),
            inputs: recipe.inputs.map((input): LinkedRecipe["inputs"][number] => {
                return {
                    input,
                    linkedRecipe: null,
                    matrixCoefficientColumnIdx: colIdx++,
                    solution: "",
                };
            }),
        };
        linkedRecipes.push(linkedRecipe);

        for (const output of linkedRecipe.outputs) {
            if (output.output.itemId === desiredItem.id) {
                const matchingInput = linkedOutputRecipe?.inputs.find((input) => input.input.itemId === desiredItem.id);
                if (matchingInput) {
                    matchingInput.linkedRecipe = linkedRecipe;
                }
                output.linkedRecipe = linkedOutputRecipe;
            }
        }

        for (const input of linkedRecipe.inputs) {
            const inputItem = getItemById(input.input.itemId);
            if (!inputItem.isRawInput) {
                resolveItemOutputRecipe(inputItem, linkedRecipe);
            }
        }
    }
    resolveItemOutputRecipe(outputItem, null);

    const numColumns = colIdx + 1;
    const matrix: Matrix<FractionLike> = [];
    const seenLinks = new Set<LinkedRecipe["inputs" | "outputs"][number]>();
    for (const linkedRecipe of linkedRecipes) {
        // the building number is itself a ratio, use the first output
        const firstOutput = linkedRecipe.outputs[0];
        matrix.push(
            buildRow(numColumns, {
                [linkedRecipe.matrixCoefficientColumnIdx]: 1,
                [firstOutput.matrixCoefficientColumnIdx]: new Fraction(firstOutput.output.throughput)
                    .inverse()
                    .multiply(-1),
            }),
        );

        // given a recipe of N inputs and M outputs, we want N + M - 1 ratios
        // it's sufficient to build ratios for all inputs against the first output
        // and all the outputs after the first with the first input
        for (const input of linkedRecipe.inputs) {
            matrix.push(
                buildRow(numColumns, {
                    [input.matrixCoefficientColumnIdx]: new Fraction(input.input.throughput).inverse(),
                    [firstOutput.matrixCoefficientColumnIdx]: new Fraction(firstOutput.output.throughput)
                        .inverse()
                        .multiply(-1),
                }),
            );
        }
        for (const output of linkedRecipe.outputs.slice(1)) {
            const firstInput = linkedRecipe.inputs[0];
            matrix.push(
                buildRow(numColumns, {
                    [firstInput.matrixCoefficientColumnIdx]: new Fraction(firstInput.input.throughput).inverse(),
                    [output.matrixCoefficientColumnIdx]: new Fraction(output.output.throughput).inverse().multiply(-1),
                }),
            );
        }

        // any input and output that is linked will have an equality relation
        const addEqualityRelation = (key: "inputs" | "outputs") => {
            for (const link of linkedRecipe[key]) {
                if (link.linkedRecipe && !seenLinks.has(link)) {
                    const otherLink = link.linkedRecipe[key === "inputs" ? "outputs" : "inputs"].find(
                        (otherLink) => otherLink.linkedRecipe === linkedRecipe,
                    )!;
                    matrix.push(
                        buildRow(numColumns, {
                            [link.matrixCoefficientColumnIdx]: 1,
                            [otherLink.matrixCoefficientColumnIdx]: -1,
                        }),
                    );
                    seenLinks.add(link);
                    seenLinks.add(otherLink);
                }
            }
        };
        addEqualityRelation("inputs");
        addEqualityRelation("outputs");
    }
    // the last one is the invariant
    const invariantColumnIdx = linkedRecipes[0].outputs.find(
        (output) => output.output.itemId === outputItemId,
    )!.matrixCoefficientColumnIdx;
    matrix.push(
        buildRow(numColumns, {
            [invariantColumnIdx]: 1,
            [-1]: throughput,
        }),
    );
    const solvedMatrix = rref(matrix, debug);
    // TODO: add splitter logic
    for (const linkedRecipe of linkedRecipes) {
        linkedRecipe.solution = solvedMatrix[linkedRecipe.matrixCoefficientColumnIdx].at(-1)!.toString();
        for (const link of [...linkedRecipe.inputs, ...linkedRecipe.outputs]) {
            link.solution = solvedMatrix[link.matrixCoefficientColumnIdx].at(-1)!.toString();
        }
    }

    return linkedRecipes;
}

export function printSolvedProduction(linkedRecipes: readonly LinkedRecipe[]) {
    return linkedRecipes
        .map((recipe) => {
            const inputs = recipe.inputs
                .map((input) => `  - ${getItemById(input.input.itemId).name} (${input.solution} units/min)`)
                .join("\n");
            const outputs = recipe.outputs
                .map((output) => `  - ${getItemById(output.output.itemId).name} (${output.solution} units/min)`)
                .join("\n");
            return `Recipe "${recipe.recipe.name}" (${recipe.recipe.buildingId} x${recipe.solution}):\nInputs:\n${inputs}\nOutputs:\n${outputs}`;
        })
        .join("\n\n");
}
