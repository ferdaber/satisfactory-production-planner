export interface RecipeInput {
    itemId: string;
    amount: number;
    // amount per min
    throughput: number;
}

export interface RecipeOutput extends RecipeInput {}

export interface Recipe {
    id: string;
    name: string;
    // true if the production tool is craft bench/build gun/equipment bench
    isManual: boolean;
    isAlternate: boolean;
    buildingId: string;
    inputs: readonly RecipeInput[];
    outputs: readonly RecipeOutput[];
    wikiUrl: string;
}
