import prettier from "prettier";
import prettierConfig from "../.prettierrc.cjs";

export function formatJson(json) {
    return prettier.format(typeof json === "string" ? json : JSON.stringify(json), {
        filepath: "file.json",
        ...prettierConfig,
    });
}

export function formatTs(source) {
    return prettier.format(source, {
        filepath: "file.ts",
        ...prettierConfig,
    });
}
