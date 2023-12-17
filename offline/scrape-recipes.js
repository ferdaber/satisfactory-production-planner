import axios from "axios";
import { load } from "cheerio";
import fs from "fs-extra";
import { formatJson } from "./util.js";

const pageUrl = `https://satisfactory.fandom.com/wiki/Category:Crafting_components`;
const response = await axios.get(pageUrl);
const $ = load(response.data);
const links = $(".mw-category-group li a");

const componentIds = links
    .map((_, el) => {
        const name = $(el).text();
        const wikiUrl = `https://satisfactory.fandom.com/${$(el).attr("href")}`;
        const id = name
            .split(/(?:\s+|-)/)
            .map((s) => s.toLowerCase())
            .join("-");
        return { name, wikiUrl, id };
    })
    .toArray();

await fs.writeFile("./offline/scrape-results/component-ids.json", await formatJson(componentIds));

function parseSpan(el, type) {
    const spanStr = $(el).attr(type);
    const spanNum = Number.parseInt(spanStr);
    return !spanStr || Number.isNaN(spanNum) ? 1 : spanNum;
}

/**
 *
 * @param {string} name
 * @returns
 */
function nameToId(name) {
    const id = name
        .split(/(?:\s+|-)/)
        .map((s) => s.toLowerCase())
        .join("-");
    return id;
}

/** @type {import('../src/types/recipe').Recipe[]} */
const recipes = [];

await Promise.all(
    componentIds.map(async ({ wikiUrl }) => {
        const response = await axios.get(wikiUrl);
        const $ = load(response.data);
        const craftingTable = $('h3:contains("Crafting")').nextUntil("h3").find("table").first();
        if (craftingTable.length !== 1) {
            console.log(`Unable to find table for page "${wikiUrl}"`);
            return;
        }
        const rows = craftingTable.find("tbody > tr").toArray();
        const headerRow = rows[0];
        const dataRows = rows.slice(1);
        const columns = $(headerRow)
            .find("th")
            .toArray()
            .flatMap((el) => {
                const name = $(el).text().toLowerCase();
                const colSpan = parseSpan(el, "colspan");
                return Array.from({ length: colSpan }, () => name);
            });
        /** @type {(typeof headerRow)[][]} */
        const cellMatrix = Array.from(dataRows, () => Array(columns.length));
        for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
            let row = dataRows[rowIdx];
            const cells = $(row).find("td").toArray();
            let colIdx = 0;
            for (const cell of cells) {
                while (cellMatrix[rowIdx][colIdx] != null) {
                    colIdx++;
                }
                const colSpan = parseSpan(cell, "colspan");
                const rowSpan = parseSpan(cell, "rowspan");
                for (let rowSpanIdx = rowIdx; rowSpanIdx < rowIdx + rowSpan; rowSpanIdx++) {
                    for (let colSpanIdx = colIdx; colSpanIdx < colIdx + colSpan; colSpanIdx++) {
                        cellMatrix[rowSpanIdx][colSpanIdx] = cell;
                    }
                }
                colIdx += colSpan;
            }
        }

        if (cellMatrix.some((row) => row.some((col) => !col))) {
            throw new Error("Unable to fill out the cell matrix");
        }

        /** @type {Set<typeof headerRow>} */
        const visitedElements = new Set();

        /** @type {import('../src/types/recipe').Recipe} */
        let recipe;
        for (let rowIdx = 0; rowIdx < cellMatrix.length; rowIdx++) {
            const row = cellMatrix[rowIdx];
            for (let colIdx = 0; colIdx < row.length; colIdx++) {
                const cellEl = row[colIdx];
                if (visitedElements.has(cellEl)) {
                    continue;
                } else {
                    visitedElements.add(cellEl);
                }
                const cell = $(cellEl);
                const colName = columns[colIdx];

                if (colName === "recipe") {
                    if (recipe) {
                        // debugger;
                        recipes.push(recipe);
                    }
                    recipe = {
                        inputs: [],
                        outputs: [],
                        isManual: false,
                        wikiUrl,
                    };

                    recipe.name = cell.text();
                    const altText = cell.find('a:contains("Alternate")');
                    recipe.isAlternate = altText.length > 0;
                    if (recipe.isAlternate) {
                        recipe.name = recipe.name.replace(/Alternate$/, "");
                    }
                    recipe.name = recipe.name.trim();
                    recipe.id = nameToId(recipe.name);
                } else if (colName === "ingredients") {
                    if (!cell.text().trim()) {
                        continue;
                    }
                    /** @type {import('../src/types/recipe').RecipeInput} */
                    const recipeInput = {};
                    const itemLink = cell.find("a");
                    recipeInput.itemId = nameToId(itemLink.nextAll().text().trim());
                    const amountStr = itemLink.prev().text().trim();
                    if (!amountStr.endsWith("×")) {
                        throw new Error(`Amount string did not end with a times symbol`);
                    } else {
                        recipeInput.amount = Number.parseFloat(amountStr);
                        if (Number.isNaN(recipeInput.amount)) {
                            throw new Error(`Unable to parse recipe input amount`);
                        }
                    }
                    const throughputText = itemLink.parent().parent().next().text();
                    recipeInput.throughput = Number.parseFloat(throughputText);
                    if (Number.isNaN(recipeInput.throughput)) {
                        throw new Error(`Unable to parse recipe throughput`);
                    }
                    recipe.inputs.push(recipeInput);
                } else if (colName === "building") {
                    const buildingLink = cell.find("a");
                    recipe.buildingId = nameToId(buildingLink.text().trim());
                } else if (colName === "products") {
                    if (!cell.text().trim()) {
                        continue;
                    }
                    /** @type {import('../src/types/recipe').RecipeOutput} */
                    const recipeOutput = {};
                    const itemLink = cell.find("a");
                    recipeOutput.itemId = nameToId(itemLink.nextAll().text().trim());
                    const amountStr = itemLink.prev().text().trim();
                    if (!amountStr.endsWith("×")) {
                        throw new Error(`Amount string did not end with a times symbol`);
                    } else {
                        recipeOutput.amount = Number.parseFloat(amountStr);
                        if (Number.isNaN(recipeOutput.amount)) {
                            throw new Error(`Unable to parse recipe output amount`);
                        }
                    }
                    const throughputText = itemLink.parent().parent().next().text();
                    recipeOutput.throughput = Number.parseFloat(throughputText);
                    if (Number.isNaN(recipeOutput.throughput)) {
                        throw new Error(`Unable to parse recipe throughput`);
                    }
                    recipe.outputs.push(recipeOutput);
                }
            }
        }
        if (recipe) {
            // debugger;
            recipes.push(recipe);
            recipe = undefined;
        }
    }),
);

recipes.sort((a, b) => a.id.localeCompare(b.id));

await fs.writeFile("./offline/scrape-results/recipes.json", await formatJson(recipes));
