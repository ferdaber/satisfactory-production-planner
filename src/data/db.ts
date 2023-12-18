import { Item } from "../types/item";
import { Recipe } from "../types/recipe";
import { ITEMS } from "./items";
import { RECIPES } from "./recipes";

const ITEM_ID_INDEX = new Map<string, Item>();
const RECIPE_ID_INDEX = new Map<string, Recipe>();
const RECIPE_OUTPUT_INDEX = new Map<string, Recipe[]>();

export function findItemById(itemId: string) {
    let item = ITEM_ID_INDEX.get(itemId);
    if (item) {
        return item;
    } else {
        item = ITEMS.find((item) => item.id === itemId);
        if (item) {
            ITEM_ID_INDEX.set(itemId, item);
        }
        return item;
    }
}

export function getItemById(itemId: string) {
    const item = findItemById(itemId);
    if (!item) {
        throw new Error(`Unable to find item with id "${itemId}"`);
    }
    return item;
}

export function findRecipeById(recipeId: string) {
    let recipe = RECIPE_ID_INDEX.get(recipeId);
    if (recipe) {
        return recipe;
    } else {
        recipe = RECIPES.find((recipe) => recipe.id === recipeId);
        if (recipe) {
            RECIPE_ID_INDEX.set(recipeId, recipe);
        }
        return recipe;
    }
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
        recipes = RECIPES.filter((recipe) => recipe.outputs.some((output) => output.itemId === itemId));
        RECIPE_OUTPUT_INDEX.set(itemId, recipes);
        return recipes;
    }
}
