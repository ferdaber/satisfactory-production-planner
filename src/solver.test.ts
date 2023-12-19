import { createFraction } from "./math/fractions";
import { printSolvedProduction, solveProduction } from "./solver";

test("Iron Plate", () => {
    const recipes = solveProduction("iron-plate", 20);
    expect(recipes.find((recipe) => recipe.dbData.id === "iron-plate")!.buildingCalcData.solution.toString()).toEqual(
        "1",
    );
});

test("Reinforced Iron Plate", () => {
    const recipes = solveProduction("reinforced-iron-plate", 10);
    expect(recipes.find((recipe) => recipe.dbData.id === "screw")!.buildingCalcData.solution.toString()).toEqual("3");
});

test("Modular Frame", () => {
    const recipes = solveProduction("modular-frame", 3);
    expect(
        recipes.find((recipe) => recipe.dbData.id === "reinforced-iron-plate")!.buildingCalcData.solution.toString(),
    ).toEqual("9/10");
    expect(recipes.find((recipe) => recipe.dbData.id === "iron-rod")!.buildingCalcData.solution.toString()).toEqual(
        createFraction(2.1).toString(),
    );
    expect(
        recipes
            .find((recipe) => recipe.dbData.id === "iron-rod")!
            .outputs["iron-rod"].feeds.reduce((acc, next) => acc.add(next.calcData.solution), createFraction(0))
            .toString(),
    ).toEqual(createFraction(18 + 13.5).toString());
});

test("Plastic", () => {
    const recipes = solveProduction("plastic", 400);
    // console.log(printSolvedProduction(recipes));
    expect(recipes.find((recipe) => recipe.dbData.id === "plastic")!.buildingCalcData.solution.toString()).toEqual(
        "20",
    );
});

test.only("Alclad Aluminum Sheet", () => {
    const recipes = solveProduction("alclad-aluminum-sheet", 100);
    console.log(printSolvedProduction(recipes));
    expect(true).toBe(true);
});
