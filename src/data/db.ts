import { Building } from "../types/building";
import { Item } from "../types/item";
import { Recipe } from "../types/recipe";
import { BUILDINGS } from "./buildings";
import { ITEMS } from "./items";
import { RECIPES } from "./recipes";

const RECIPE_OUTPUT_INDEX = new Map<string, Recipe[]>();

export function findItemById(itemId: string) {
    return ITEMS[itemId] as Item | undefined;
}

export function getItemById(itemId: string) {
    const item = findItemById(itemId);
    if (!item) {
        throw new Error(`Unable to find item with id "${itemId}"`);
    }
    return item;
}

export function findRecipeById(recipeId: string) {
    return RECIPES[recipeId] as Recipe | undefined;
}

export function getRecipeById(recipeId: string) {
    const recipe = findRecipeById(recipeId);
    if (!recipe) {
        throw new Error(`Unable to find recipe with id "${recipeId}"`);
    }
    return recipe;
}

export function getRecipesByOutputId(itemId: string) {
    let recipes = RECIPE_OUTPUT_INDEX.get(itemId);
    if (recipes) {
        return recipes;
    } else {
        recipes = [];
        for (const recipeId in RECIPES) {
            if (RECIPES[recipeId].outputs.some((output) => output.itemId === itemId)) {
                recipes.push(RECIPES[recipeId]);
            }
        }
        RECIPE_OUTPUT_INDEX.set(itemId, recipes);
        return recipes;
    }
}

export function findBuildingById(buildingId: string) {
    return BUILDINGS[buildingId] as Building | undefined;
}

export function getBuildingById(buildingId: string) {
    const building = findBuildingById(buildingId);
    if (!building) {
        throw new Error(`Unable to find building with id "${buildingId}"`);
    }
    return building;
}
