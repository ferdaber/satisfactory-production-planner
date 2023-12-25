import { getItemById, getRecipesByOutputId } from "../data/db";
import Fraction, { FractionLike } from "../math/fraction";
import { Matrix } from "../math/matrix";
import { rref } from "../math/row-reduce";
import { Item } from "../types/item";
import { Recipe } from "../types/recipe";
import { LinkedRecipe, LinkedRecipeIOFeed } from "./types";

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
    // this is ordered by traversal
    const linkedRecipes: LinkedRecipe[] = [];
    const uniqueRecipes = new Map<Recipe, LinkedRecipe>();

    // this is used for possible recycle feeds after the initial resolution
    // the unlinked output for the overall desired item is ignored
    const unlinkedOutputFeeds: { feed: LinkedRecipeIOFeed; recipe: LinkedRecipe; itemId: string }[] = [];
    const recipesByInputId: { [inputItemId: string]: LinkedRecipe[] } = {};

    let colIdx = 0;
    function resolveItemOutputRecipe(
        desiredItem: Item,
        outputFeedLink: { recipe: LinkedRecipe; feed: LinkedRecipeIOFeed } | null,
    ): LinkedRecipe {
        const matchingRecipes = getRecipesByOutputId(desiredItem.id);
        const primaryRecipes = matchingRecipes.filter((recipe) => !recipe.isAlternate && !recipe.isManual);
        const recipe = primaryRecipes.sort((a, b) => {
            // silly heuristic:
            // see if there exists a recipe that has the same ID as the item
            // ignore all "Unpackage X recipes"
            // then for two competing recipes, pick the one where the index of the output in the recipe is the lowest (it's the game's "intended" primary recipe)
            // if they tie, check for the one where it is the *only* output
            // if that still ties, use the one with the highest throughput
            // if that still ties, use the one with the highest amount per cycle
            const sameIdSort = Number(b.id === desiredItem.id) - Number(a.id === desiredItem.id);
            if (sameIdSort) {
                return sameIdSort;
            }
            const unpackageSort = Number(a.id.includes("unpackage-")) - Number(b.id.includes("unpackage-"));
            if (unpackageSort) {
                return unpackageSort;
            }
            const aIndex = a.outputs.findIndex((output) => output.itemId === desiredItem.id),
                bIndex = b.outputs.findIndex((output) => output.itemId === desiredItem.id);
            const indexSort = aIndex - bIndex;
            if (indexSort) {
                return indexSort;
            }
            const numOutputsSort = a.outputs.length - b.outputs.length;
            if (numOutputsSort) {
                return numOutputsSort;
            }
            const aOutput = a.outputs[aIndex],
                bOutput = b.outputs[bIndex];
            const throughputSort = bOutput.throughput - aOutput.throughput,
                amountSort = bOutput.amount - aOutput.amount;
            return throughputSort || amountSort;
        })[0];

        let linkedRecipe = uniqueRecipes.get(recipe);
        if (linkedRecipe) {
            // for a linked recipe that already exists, we only need to create a new output for it
            // pointing to that recipe
            if (!outputFeedLink) {
                debugger; // this should never happen
                throw new Error(`Unexpected empty output link for an existing recipe`);
            }
            const existingOutput = linkedRecipe.outputs[desiredItem.id];
            const feed: LinkedRecipeIOFeed = {
                calcData: outputFeedLink.feed.calcData,
                link: {
                    oppositeFeed: outputFeedLink.feed,
                    recipe: outputFeedLink.recipe,
                },
            };
            outputFeedLink.feed.link = {
                oppositeFeed: feed,
                recipe: linkedRecipe,
            };
            existingOutput.feeds.push(feed);
        } else {
            linkedRecipe = {
                dbData: recipe,
                buildingCalcData: {
                    matrixColumnIdx: colIdx++,
                    solution: new Fraction(-1),
                },
                outputs: {},
                inputs: {},
            };
            linkedRecipes.push(linkedRecipe);
            uniqueRecipes.set(recipe, linkedRecipe);
            for (const output of recipe.outputs) {
                // for a new linked recipe, create outputs and if there is a corresponding input
                // link the output with the counterpart input and link the two recipes together
                // otherwise create a brand new output that points nowhere, and track that
                if (outputFeedLink && desiredItem.id === output.itemId) {
                    const feed: LinkedRecipeIOFeed = {
                        calcData: outputFeedLink.feed.calcData,
                        link: {
                            oppositeFeed: outputFeedLink.feed,
                            recipe: outputFeedLink.recipe,
                        },
                    };
                    outputFeedLink.feed.link = {
                        oppositeFeed: feed,
                        recipe: linkedRecipe,
                    };
                    linkedRecipe.outputs[output.itemId] = {
                        dbData: output,
                        feeds: [feed],
                    };
                } else {
                    const feed: LinkedRecipeIOFeed = {
                        calcData: {
                            matrixColumnIdx: colIdx++,
                            solution: new Fraction(-1),
                        },
                        link: null,
                    };
                    linkedRecipe.outputs[output.itemId] = {
                        dbData: output,
                        feeds: [feed],
                    };
                    if (output.itemId !== outputItemId) {
                        unlinkedOutputFeeds.push({
                            itemId: output.itemId,
                            feed,
                            recipe: linkedRecipe,
                        });
                    }
                }
            }
            for (const input of recipe.inputs) {
                // for a new linked recipe, create inputs and if it's not a raw ingredient
                // resolve the linked recipe for that input's desired item
                // it's `linkData` will be populated when the output of the linked recipe is resolved
                const feed: LinkedRecipeIOFeed = {
                    calcData: {
                        matrixColumnIdx: colIdx++,
                        solution: new Fraction(-1),
                    },
                    link: null,
                };
                linkedRecipe.inputs[input.itemId] = {
                    dbData: input,
                    feeds: [feed],
                };
                const inputItem = getItemById(input.itemId);
                recipesByInputId[input.itemId] ??= [];
                recipesByInputId[input.itemId].push(linkedRecipe);
                if (!inputItem.isRawInput) {
                    resolveItemOutputRecipe(inputItem, { feed, recipe: linkedRecipe });
                }
            }
        }

        return linkedRecipe;
    }
    const desiredItemRecipe = resolveItemOutputRecipe(outputItem, null);

    // try to resolve recycle feeds
    for (const unlinkedOutput of unlinkedOutputFeeds) {
        if (recipesByInputId[unlinkedOutput.itemId]) {
            const receivingRecipe = recipesByInputId[unlinkedOutput.itemId].filter(
                (linkedRecipe) => linkedRecipe !== unlinkedOutput.recipe,
            )[0];
            const existingInput = receivingRecipe.inputs[unlinkedOutput.itemId];
            const feed: LinkedRecipeIOFeed = {
                calcData: unlinkedOutput.feed.calcData,
                link: {
                    oppositeFeed: unlinkedOutput.feed,
                    recipe: unlinkedOutput.recipe,
                },
                isRecycle: true,
            };
            unlinkedOutput.feed.link = {
                oppositeFeed: feed,
                recipe: receivingRecipe,
            };
            unlinkedOutput.feed.isRecycle = true;
            existingInput.feeds.push(feed);
        }
    }

    // the number of columns is the number of variables + the constant coefficients
    const numColumns = colIdx + 1;
    const matrix: Matrix<FractionLike> = [];
    // const seenLinks = new Set<LinkedRecipe["inputs" | "outputs"][number]>();
    for (const linkedRecipe of linkedRecipes) {
        // the building number is itself a ratio, use the first input since inputs are guaranteed to have single feeds
        const outputs = Object.values(linkedRecipe.outputs);
        const inputs = Object.values(linkedRecipe.inputs);
        const firstOutput = outputs[0];
        const firstInput = inputs[0];
        // for this ratio: x_buildings = 1/input_throughput * (x_input_feed_1 + ... + x_input_feed_n)
        matrix.push(
            buildRow(numColumns, {
                [linkedRecipe.buildingCalcData.matrixColumnIdx]: -1,
                ...Object.fromEntries(
                    firstInput.feeds.map((feed) => [
                        feed.calcData.matrixColumnIdx,
                        new Fraction(firstInput.dbData.throughput).inverse(),
                    ]),
                ),
            }),
        );

        // given a recipe of N input feeds and M output feeds, we want N + M - 1 ratios
        // with each feed given its own equation
        // it's sufficient to build ratios for all input feeds against the first output (with all its feeds)
        // and all the output feeds after the first with the first input (with all its feeds)
        for (const input of inputs) {
            // for this ratio: 1/input_throughput * (x_input_feed_1 + ... + x_input_feed_n) = 1/output_throughput * (x_output_feed_1 + ... + x_output_feed_n)
            matrix.push(
                buildRow(numColumns, {
                    ...Object.fromEntries(
                        input.feeds.map((feed) => [
                            feed.calcData.matrixColumnIdx,
                            new Fraction(input.dbData.throughput).inverse().negate(),
                        ]),
                    ),
                    ...Object.fromEntries(
                        firstOutput.feeds.map((feed) => [
                            feed.calcData.matrixColumnIdx,
                            new Fraction(firstOutput.dbData.throughput).inverse(),
                        ]),
                    ),
                }),
            );
        }
        for (const output of outputs.slice(1)) {
            matrix.push(
                buildRow(numColumns, {
                    ...Object.fromEntries(
                        firstInput.feeds.map((feed) => [
                            feed.calcData.matrixColumnIdx,
                            new Fraction(firstInput.dbData.throughput).inverse().negate(),
                        ]),
                    ),
                    ...Object.fromEntries(
                        output.feeds.map((feed) => [
                            feed.calcData.matrixColumnIdx,
                            new Fraction(output.dbData.throughput).inverse(),
                        ]),
                    ),
                }),
            );
        }
    }
    // the last one is the invariant
    const invariantColumnIdx = desiredItemRecipe.outputs[outputItemId].feeds[0].calcData.matrixColumnIdx;
    matrix.push(
        buildRow(numColumns, {
            [invariantColumnIdx]: 1,
            [-1]: throughput,
        }),
    );
    // for this to be a consistent system of equations, it must be an N x N+1 matrix
    if (matrix.length !== numColumns - 1) {
        debugger;
        throw new Error(`Unexpected ${matrix.length} x ${matrix[0].length} matrix size`);
    }
    const solvedMatrix = rref(matrix, debug);
    for (const linkedRecipe of linkedRecipes) {
        linkedRecipe.buildingCalcData.solution = solvedMatrix[linkedRecipe.buildingCalcData.matrixColumnIdx].at(-1)!;
        for (const feed of [...Object.values(linkedRecipe.inputs), ...Object.values(linkedRecipe.outputs)].flatMap(
            (io) => io.feeds,
        )) {
            feed.calcData.solution = solvedMatrix[feed.calcData.matrixColumnIdx].at(-1)!;
        }
    }

    return linkedRecipes;
}
