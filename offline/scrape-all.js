import axios from "axios";
import { load } from "cheerio";
import fs from "fs-extra";
import { formatTs } from "./util.js";

async function getInitialComponentUrls() {
    const pageUrl = `https://satisfactory.fandom.com/wiki/Category:Crafting_components`;
    const response = await axios.get(pageUrl);
    const $ = load(response.data);
    const links = $(".mw-category-group li a");

    const urls = links
        .map((_, el) => {
            const wikiUrl = `https://satisfactory.fandom.com/${$(el).attr("href")}`;
            return wikiUrl;
        })
        .toArray();

    return urls;
}

/**
 *
 * @param {string} name
 * @returns
 */
function nameToId(name) {
    if (/(Hog|Splitter|Hatcher|Stinger) Remains/.test(name)) {
        return "alien-remains";
    }
    const id = name
        .split(/(?:\s+|-)/)
        .map((s) => s.toLowerCase())
        .join("-");
    return id;
}

/**
 * @param {{ wikiUrl: string; html: string }} data
 */
function parsePageForRecipes(data) {
    const { wikiUrl, html } = data;
    const $ = load(html);
    const craftingTable = $('h2:contains("Obtaining")')
        .nextUntil("h2", 'h3:contains("Crafting")')
        .nextUntil("h3")
        .find("table")
        .first();
    if (!craftingTable.length) {
        return false;
    }
    const rows = craftingTable.find("tbody > tr").toArray();
    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    const parseSpan = (el, type) => {
        const spanStr = $(el).attr(type);
        const spanNum = Number.parseInt(spanStr);
        return !spanStr || Number.isNaN(spanNum) ? 1 : spanNum;
    };

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

    /** @type {import('../src/types/recipe.js').Recipe} */
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
                    if (recipe.id in g_recipes) {
                        console.log(
                            `Ignoring duplicate recipe "${recipe.name}" found under "${recipe.wikiUrl}", other URL: "${
                                g_recipes[recipe.id].wikiUrl
                            }"`,
                        );
                    } else {
                        g_recipes[recipe.id] = recipe;
                    }
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
                /** @type {import('../src/types/recipe.js').RecipeInput} */
                const recipeInput = {};
                const itemLink = cell.find("a");
                const itemUrl = `https://satisfactory.fandom.com/${itemLink.attr("href")}`;
                g_urlsToParse.push(itemUrl);
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
                const buildingUrl = `https://satisfactory.fandom.com/${buildingLink.attr("href")}`;
                g_buildingUrlsToParse.push(buildingUrl);
            } else if (colName === "products") {
                if (!cell.text().trim()) {
                    continue;
                }
                /** @type {import('../src/types/recipe.js').RecipeOutput} */
                const recipeOutput = {};
                const itemLink = cell.find("a");
                recipeOutput.itemId = nameToId(itemLink.nextAll().text().trim());
                const itemUrl = `https://satisfactory.fandom.com/${itemLink.attr("href")}`;
                g_urlsToParse.push(itemUrl);
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
        if (recipe.id in g_recipes) {
            console.log(
                `Ignoring duplicate recipe "${recipe.name}" found under "${recipe.wikiUrl}", other URL: "${
                    g_recipes[recipe.id].wikiUrl
                }"`,
            );
        } else {
            g_recipes[recipe.id] = recipe;
        }
    }
    return true;
}

/** @param {{ wikiUrl: string, html: string, hasRecipes: boolean }} data */
async function parsePageForItem(data) {
    const { wikiUrl, html, hasRecipes } = data;
    const $ = load(html);

    const stackSizeStr = $('[data-source="stackSize"] .pi-data-value').text().trim();
    let stackSize;
    if (stackSizeStr === "N/A") {
        stackSize = -1;
    } else {
        stackSize = Number.parseInt(stackSizeStr);
    }

    const displayName = wikiUrl.endsWith("_Remains") ? "Alien Remains" : $('[data-source="displayName"]').text();
    const id = nameToId(displayName);
    const wikiImgUrl = $('[data-source="image"] img').attr("src");

    const imgResponse = await axios.get(wikiImgUrl, { responseType: "arraybuffer" });
    const imgContentType = imgResponse.headers.getContentType();
    const imgExt = imgContentType.replace(/^image\//, "");
    await fs.ensureDir("./offline/scrape-results/images");
    await fs.writeFile(`./offline/scrape-results/images/${id}.${imgExt}`, imgResponse.data);

    const hasResourceAcquisition =
        $('h2:contains("Obtaining")').nextUntil("h2", 'h3:contains("Resource acquisition")').length > 0;

    if (id in g_items) {
        console.log(
            `Ignoring duplicate item "${displayName}" found under "${wikiUrl}", other URL: "${g_items[id].wikiUrl}"`,
        );
    } else {
        g_items[id] = {
            id,
            name: displayName,
            wikiUrl,
            wikiImgUrl,
            stackSize,
            imgUrl: `assets/images/${id}.${imgExt}`,
            isFluid: stackSize === -1,
            isRawInput: id !== "silica" && id !== "uranium-waste" && (hasResourceAcquisition || !hasRecipes),
        };
    }
}

/** @param {{ wikiUrl: string, html: string }} data */
async function parsePageForBuilding(data) {
    const { wikiUrl, html } = data;
    const $ = load(html);

    let displayName = $('[data-source="displayName"]').text();
    if (displayName.includes("Miner")) {
        displayName = "Miner";
    }
    const id = nameToId(displayName);
    const wikiImgUrl = $('[data-source="image"] img').attr("src");

    const imgResponse = await axios.get(wikiImgUrl, { responseType: "arraybuffer" });
    const imgContentType = imgResponse.headers.getContentType();
    const imgExt = imgContentType.replace(/^image\//, "");
    await fs.ensureDir("./offline/scrape-results/images");
    await fs.writeFile(`./offline/scrape-results/images/${id}.${imgExt}`, imgResponse.data);

    if (id in g_buildings) {
        console.log(
            `Ignoring duplicate building  "${displayName}" found under "${wikiUrl}", other URL: "${g_buildings[id].wikiUrl}"`,
        );
    } else {
        g_buildings[id] = {
            id,
            name: displayName,
            wikiUrl,
            wikiImgUrl,
            imgUrl: `assets/images/${id}.${imgExt}`,
        };
    }
}

/**
 * @template T
 * @param {T} obj
 * @param {(a: [keyof T, T[keyof T]], b: [keyof T, T[keyof T]]) => number} sortCb
 * @returns
 */
function sortObjectEntries(obj, sortCb) {
    const entries = [];
    for (const key of Object.keys(obj)) {
        entries.push([key, obj[key]]);
        delete obj[key];
    }
    entries.sort(sortCb);
    for (const [key, val] of entries) {
        obj[key] = val;
    }
    return obj;
}

/** @type {{ [recipeId: string]: import('../src/types/recipe').Recipe }} */
const g_recipes = Object.create(null);
/** @type {{ [itemId: string]: import('../src/types/item').Item }} */
const g_items = Object.create(null);
/** @type {{ [buildingId: string]: import('../src/types/building').Building }}*/
const g_buildings = Object.create(null);
/** @type {string[]} */
const g_urlsToParse = await getInitialComponentUrls();
/** @type {string[]} */
const g_buildingUrlsToParse = [];
/** @type {Set<string>} */
const g_parsedUrls = new Set();

const IGNORE_LIST = /(?:Superposition_Oscillator|Quantum_Computer)$/;

while (g_urlsToParse.length) {
    const wikiUrl = g_urlsToParse.pop();
    if (g_parsedUrls.has(wikiUrl) || IGNORE_LIST.test(wikiUrl)) {
        continue;
    } else {
        g_parsedUrls.add(wikiUrl);
    }
    console.log(`Scraping page "${wikiUrl}"`);
    const response = await axios.get(wikiUrl);
    const html = response.data;
    const hasRecipes = parsePageForRecipes({ html, wikiUrl });
    await parsePageForItem({ hasRecipes, html, wikiUrl });
}

while (g_buildingUrlsToParse.length) {
    const wikiUrl = g_buildingUrlsToParse.pop();

    if (g_parsedUrls.has(wikiUrl)) {
        continue;
    } else {
        g_parsedUrls.add(wikiUrl);
    }

    console.log(`Scraping page "${wikiUrl}"`);
    const response = await axios.get(wikiUrl);
    const html = response.data;
    await parsePageForBuilding({ html, wikiUrl });
}

sortObjectEntries(g_recipes, ([, a], [, b]) => {
    return a.wikiUrl.localeCompare(b.wikiUrl) || a.name.localeCompare(b.name);
});

sortObjectEntries(g_items, ([, a], [, b]) => {
    return Number(b.isRawInput) - Number(a.isRawInput) || a.name.localeCompare(b.name);
});

sortObjectEntries(g_buildings, ([, a], [, b]) => {
    return a.name.localeCompare(b.name);
});

console.log(
    `Found ${Object.keys(g_recipes).length} recipes:\n${Object.values(g_recipes)
        .map((recipe) => `  - ${recipe.name} [${recipe.wikiUrl}]`)
        .join("\n")}`,
);
console.log(
    `Found ${Object.keys(g_items).length} items:\n${Object.values(g_items)
        .map((item) => `  - ${item.name} [${item.wikiUrl}] (${item.isRawInput ? "Raw" : "Crafted"})`)
        .join("\n")}`,
);
console.log(
    `Found ${Object.keys(g_buildings).length} buildings:\n${Object.values(g_buildings)
        .map((building) => `  - ${building.name} [${building.wikiUrl}]`)
        .join("\n")}`,
);

console.log(`Saving recipes...`);
await fs.writeFile(
    "./src/data/recipes.ts",
    await formatTs(`
import type { Recipe } from "../types/recipe";

export const RECIPES: Readonly<Record<string, Recipe>> = ${JSON.stringify(g_recipes)};
`),
);

console.log(`Saving items...`);
await fs.writeFile(
    "./src/data/items.ts",
    await formatTs(`
import type { Item } from "../types/item";

export const ITEMS: Readonly<Record<string, Item>> = ${JSON.stringify(g_items)};
`),
);

console.log(`Saving buildings...`);
await fs.writeFile(
    "./src/data/buildings.ts",
    await formatTs(`
import type { Building } from "../types/building";

export const BUILDINGS: Readonly<Record<string, Building>> = ${JSON.stringify(g_buildings)};
`),
);

console.log(`Saving images...`);
fs.cpSync("./offline/scrape-results/images", "./public/assets/images", { overwrite: true, recursive: true });
