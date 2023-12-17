import axios from "axios";
import { load } from "cheerio";
import fs from "fs-extra";
import { formatJson } from "./util.js";

const IDS = [
    "alien-organs",
    "bauxite",
    "caterium-ore",
    "coal",
    "compacted-coal",
    "copper-ore",
    "crude-oil",
    "flower-petals",
    "iron-ore",
    "leaves",
    "limestone",
    "mycelia",
    "nitrogen-gas",
    "power-slug",
    "raw-quartz",
    "sam-ore",
    "sulfur",
    "uranium",
    "vines",
    "water",
    "wood",
];

/**
 *
 * @param {string} kebab
 * @returns
 */
function toScreamingSnake(kebab) {
    return kebab
        .split("-")
        .map((s) => s[0].toUpperCase() + s.substring(1))
        .join("_");
}

const results = await Promise.all(
    IDS.map(async (id) => {
        const slug = id === "sam-ore" ? "SAM_Ore" : toScreamingSnake(id);
        const url = `https://satisfactory.fandom.com/wiki/${slug}`;
        let response;
        try {
            response = await axios.get(url);
        } catch (err) {
            const myError = new Error(`Unable to GET "${wikiUrl}"`);
            myError.cause = err;
            throw myError;
        }
        const html = response.data;
        const $ = load(html);

        const stackSizeStr = $('[data-source="stackSize"] .pi-data-value').text().trim();
        let stackSize;
        if (stackSizeStr === "N/A") {
            stackSize = -1;
        } else {
            stackSize = Number.parseInt(stackSizeStr);
        }

        const displayName = $('[data-source="displayName"]').text();
        const wikiUrl = url;
        const wikiImgUrl = $('[data-source="image"] img').attr("src");

        const imgResponse = await axios.get(wikiImgUrl, { responseType: "arraybuffer" });
        const imgContentType = imgResponse.headers.getContentType();
        const imgExt = imgContentType.replace(/^image\//, "");
        await fs.ensureDir("./offline/scrape-results/images/raw-items");
        await fs.writeFile(`./offline/scrape-results/images/raw-items/${id}.${imgExt}`, imgResponse.data);

        return {
            id,
            name: displayName,
            wikiUrl,
            wikiImgUrl,
            stackSize,
            imgUrl: `assets/images/${id}.${imgExt}`,
            isFluid: stackSize === -1,
            isRawInput: id !== "compacted-coal",
            extractorType: null,
        };
    }),
);

await fs.writeFile(
    "./offline/scrape-results/raw-items.json",
    await formatJson(JSON.stringify(results.filter(Boolean))),
);
