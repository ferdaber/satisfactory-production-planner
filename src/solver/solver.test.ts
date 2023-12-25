import { solveProduction } from "./solver";
import Fraction, { FractionLike } from "../math/fraction";
import { LinkedRecipe } from "./types";
import { assertNever } from "../utils";
import { expect, test } from "@jest/globals";
import { getBuildingById, getItemById, getRecipeById } from "../data/db";
import type { MatcherFunction } from "expect";

const toHaveBuildingSolution: MatcherFunction<[expected: FractionLike]> = function (_linkedRecipe, _expected) {
    const linkedRecipe = _linkedRecipe as LinkedRecipe;
    const actual = linkedRecipe.buildingCalcData.solution,
        expected = new Fraction(_expected);
    const pass = actual.equals(expected);
    return {
        message: () =>
            [
                this.utils.matcherHint(
                    "toHaveBuildingSolution",
                    `"${getRecipeById(linkedRecipe.dbData.id).name}" recipe`,
                    undefined,
                    {
                        ...this,
                        comment: `solution for building "${getBuildingById(linkedRecipe.dbData.buildingId).name}"`,
                    },
                ),
                "",
                `Expected: ${pass ? "not " : ""}${this.utils.printExpected(expected.toString())}`,
                `Received: ${this.utils.printReceived(actual.toString())}`,
            ].join("\n"),
        pass,
    };
};

const toHaveFeedSolution: MatcherFunction<[feedDescriptor: string, expected: FractionLike | FractionLike[]]> =
    function (_linkedRecipe, feedDescriptor, _expected) {
        const linkedRecipe = _linkedRecipe as LinkedRecipe;
        const [io, _itemId] = feedDescriptor.split(".");
        const ioKey =
            io === "in" ? "inputs" : io === "out" ? "outputs" : assertNever(`Feed I/O key to be "in" or "out"`);
        const itemId = _itemId || linkedRecipe.dbData.id;
        const actual = linkedRecipe[ioKey][itemId].feeds.map((feed) => feed.calcData.solution);
        const expected = (Array.isArray(_expected) ? _expected : [_expected]).map((val) => new Fraction(val));
        const pass = actual.length === expected.length && actual.every((f, idx) => f.equals(expected[idx]));
        return {
            message: () =>
                [
                    this.utils.matcherHint(
                        "toHaveFeedSolution",
                        `"${getRecipeById(linkedRecipe.dbData.id).name}" recipe`,
                        undefined,
                        {
                            ...this,
                            comment: `solution for ${ioKey} feed of item "${getItemById(itemId).name}"`,
                        },
                    ),
                    "",
                    `Expected: ${pass ? "not " : ""}${this.utils.printExpected(expected.map(String))}`,
                    `Received: ${this.utils.printReceived(actual.map(String))}`,
                ].join("\n"),
            pass,
        };
    };

expect.extend({
    toHaveBuildingSolution,
    toHaveFeedSolution,
});

declare module "expect" {
    interface AsymmetricMatchers {
        toHaveBuildingSolution(expected: FractionLike): void;
        toHaveFeedSolution(
            feedDescriptor: `${"in" | "out"}.${string}` | `${"in" | "out"}`,
            expected: FractionLike,
        ): void;
    }

    interface Matchers<R> {
        toHaveBuildingSolution(expected: FractionLike): R;
        toHaveFeedSolution(feedDescriptor: `${"in" | "out"}.${string}` | `${"in" | "out"}`, expected: FractionLike): R;
    }
}

function getLinkedRecipe(recipes: readonly LinkedRecipe[], id: string) {
    return recipes.find((recipe) => recipe.dbData.id === id)!;
}

test("Iron Plate", () => {
    const recipes = solveProduction("iron-plate", 20);
    expect(getLinkedRecipe(recipes, "iron-plate")).toHaveBuildingSolution(1);
});

test("Reinforced Iron Plate", () => {
    const recipes = solveProduction("reinforced-iron-plate", 10);
    expect(getLinkedRecipe(recipes, "screw")).toHaveBuildingSolution("3");
});

test("Modular Frame", () => {
    const recipes = solveProduction("modular-frame", 3);
    expect(getLinkedRecipe(recipes, "reinforced-iron-plate")).toHaveBuildingSolution("9/10");
    expect(getLinkedRecipe(recipes, "iron-rod")).toHaveBuildingSolution(new Fraction(2.1).toString());
    expect(getLinkedRecipe(recipes, "iron-rod")).toHaveFeedSolution("out", [13.5, 18]);
});

test("Plastic", () => {
    const recipes = solveProduction("plastic", 400);
    // console.log(printSolvedProduction(recipes));
    expect(getLinkedRecipe(recipes, "plastic")).toHaveBuildingSolution("20");
});

test("Alclad Aluminum Sheet", () => {
    const recipes = solveProduction("alclad-aluminum-sheet", 100);
    // console.log(printSolvedProduction(recipes));
    expect(getLinkedRecipe(recipes, "alumina-solution")).toHaveBuildingSolution("5/6");
    expect(getLinkedRecipe(recipes, "alumina-solution")).toHaveFeedSolution("in.water", [100, 50]);
});
