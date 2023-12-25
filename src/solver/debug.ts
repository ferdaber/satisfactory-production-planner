import { getItemById } from "../data/db";
import { LinkedRecipeIO, LinkedRecipe } from "./types";

function printIo(io: LinkedRecipeIO, type: "input" | "output") {
    const dirStr = type === "input" ? "from" : "to";
    if (io.feeds.length === 1) {
        let str = `  - ${getItemById(io.dbData.itemId).name} (${io.feeds[0].calcData.solution} units/min)`;
        if (io.feeds[0].link) {
            str += ` ${dirStr} recipe "${io.feeds[0].link.recipe.dbData.name}"`;
        }
        return str;
    } else {
        return [
            `  - ${getItemById(io.dbData.itemId).name} (split)`,
            ...io.feeds.map((feed) => {
                let str = `    - ${feed.calcData.solution} units/min`;
                if (feed.link) {
                    str += ` ${dirStr} recipe "${feed.link.recipe.dbData.name}"`;
                }
                return str;
            }),
        ].join("\n");
    }
}

export function printSolvedProduction(linkedRecipes: readonly LinkedRecipe[]) {
    return linkedRecipes
        .map((recipe) => {
            const inputs = Object.values(recipe.inputs)
                .map((io) => printIo(io, "input"))
                .join("\n");
            const outputs = Object.values(recipe.outputs)
                .map((io) => printIo(io, "output"))
                .join("\n");
            return `Recipe "${recipe.dbData.name}" (${recipe.dbData.buildingId} x${recipe.buildingCalcData.solution}):\nInputs:\n${inputs}\nOutputs:\n${outputs}`;
        })
        .join("\n\n");
}
