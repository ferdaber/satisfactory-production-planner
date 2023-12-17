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

const results = await Promise.all(
    componentIds.map(async ({ id, wikiUrl }) => {
        let response;
        try {
            response = await axios.get(wikiUrl);
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
        const wikiImgUrl = $('[data-source="image"] img').attr("src");

        const imgResponse = await axios.get(wikiImgUrl, { responseType: "arraybuffer" });
        const imgContentType = imgResponse.headers.getContentType();
        const imgExt = imgContentType.replace(/^image\//, "");
        await fs.ensureDir("./offline/scrape-results/images/components");
        await fs.writeFile(`./offline/scrape-results/images/components/${id}.${imgExt}`, imgResponse.data);

        return {
            id,
            name: displayName,
            wikiUrl,
            wikiImgUrl,
            stackSize,
            imgUrl: `assets/images/${id}.${imgExt}`,
            isFluid: stackSize === -1,
            isRawInput: false,
            extractorType: null,
        };
    }),
);

await fs.writeFile("./offline/scrape-results/components.json", await formatJson(results.filter(Boolean)));
