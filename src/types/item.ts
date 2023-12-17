// unused, maybe later for UI
export type ItemKind =
    | "raw"
    | "ingot"
    | "fluid"
    | "organic"
    | "part-standard"
    | "part-electronic"
    | "part-communications"
    | "part-container"
    | "part-nuclear"
    | "fuel"
    | "consumable"
    | "ammo"
    | "waste"
    | "quest";

export type ItemExtractorType = "miner" | "water-extractor" | "oil-extractor" | "resource-well-extractor";

export interface Item {
    id: string;
    name: string;
    // if the item is extractable from a node, get the extractor
    extractorType: ItemExtractorType | null;
    isRawInput: boolean;
    isFluid: boolean;
    stackSize: number;
    imgUrl: string;
    wikiUrl: string;
    wikiImgUrl: string;
}
