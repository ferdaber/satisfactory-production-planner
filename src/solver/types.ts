import { Fraction } from "../math/fraction";
import { RecipeInput, RecipeOutput, Recipe } from "../types/recipe";

export interface LinkedRecipeCalcData {
    matrixColumnIdx: number;
    solution: Fraction;
}

export interface LinkedRecipeIOFeedLink {
    recipe: LinkedRecipe;
    oppositeFeed: LinkedRecipeIOFeed;
}

export interface LinkedRecipeIOFeed {
    calcData: LinkedRecipeCalcData;
    link: LinkedRecipeIOFeedLink | null;
    isRecycle?: boolean;
}

export interface LinkedRecipeIO<T extends RecipeInput | RecipeOutput = RecipeInput | RecipeOutput> {
    dbData: T;
    // this represents a specific input or output feed into this recipe
    // for BOTH outputs and inputs it can be multiple feeds (splitter) for a single item
    // an output can have multiple feeds if the same recipe is re-used for multiple destinations
    // an input can have multiple feeds if an output is reused as a recycle feed (think water production from alumina)
    // a feed can be connected to another recipe, or it can be unlinked (in the case of leaf or root nodes)
    feeds: LinkedRecipeIOFeed[];
}

export interface LinkedRecipe {
    dbData: Recipe;
    buildingCalcData: LinkedRecipeCalcData;
    inputs: { [itemId: string]: LinkedRecipeIO };
    outputs: { [itemId: string]: LinkedRecipeIO };
}
