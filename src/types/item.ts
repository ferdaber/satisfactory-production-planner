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

export interface Item {
    id: string;
    name: string;
    isRawInput: boolean;
    isFluid: boolean;
    stackSize: number;
    imgUrl: string;
    wikiUrl: string;
    wikiImgUrl: string;
}
