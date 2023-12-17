import { printSolvedProduction, solveProduction } from "./solver";

test("Iron Plate", () => {
    const recipes = solveProduction("iron-plate", 20);
    expect(recipes.find((recipe) => recipe.recipe.id === "iron-plate")!.solution).toEqual("1");
});

test("Reinforced Iron Plate", () => {
    const recipes = solveProduction("reinforced-iron-plate", 10);
    expect(recipes.find((recipe) => recipe.recipe.id === "screw")!.solution).toEqual("3");
});

test("Modular Frame", () => {
    const recipes = solveProduction("modular-frame", 3);
    console.log(printSolvedProduction(recipes));
    expect(recipes.find((recipe) => recipe.recipe.id === "reinforced-iron-plate")!.solution).toEqual("9/10");
});
