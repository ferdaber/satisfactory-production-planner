import mermaid from "mermaid";
import { useEffect, useMemo, useState } from "react";
import { Item } from "../types/item";
import { solveProduction } from "../solver";
import { getItemById } from "../data/db";
import createPanzoom from "panzoom";

type Props = {
    desiredItem: Item | undefined;
};

function useMermaidChart(container: HTMLElement | undefined | null, markup: string) {
    useEffect(() => {
        if (!container || !markup) return;
        const chart = document.createElement("pre");
        chart.innerHTML = markup;
        container.appendChild(chart);
        mermaid.run({
            nodes: [chart],
            suppressErrors: true,
            postRenderCallback: (svgId) => {
                const svg = document.getElementById(svgId)!;
                svg.addEventListener("contextmenu", (ev) => {
                    ev.preventDefault();
                });
                createPanzoom(svg, {
                    beforeMouseDown: (ev) => {
                        return !(ev.ctrlKey || ev.metaKey);
                    },
                    zoomDoubleClickSpeed: 1,
                });
            },
        });
        return () => {
            container.removeChild(chart);
        };
    }, [container, markup]);
}

function buildChartMarkup(desiredItem: Item) {
    const recipes = solveProduction(desiredItem.id, 100);
    const statements: string[] = [`flowchart LR`];
    for (const recipe of recipes.slice().reverse()) {
        // define a node
        const label = JSON.stringify(`${recipe.dbData.buildingId}\n-${recipe.dbData.name}-`);
        statements.push(`${recipe.dbData.id}[${label}]`);

        // set outgoing links
        for (const output of Object.values(recipe.outputs)) {
            for (const feed of output.feeds) {
                if (feed.link) {
                    const linkLabel = JSON.stringify(
                        `${getItemById(output.dbData.itemId).name} (${feed.calcData.solution} upm)`,
                    );
                    statements.push(`${recipe.dbData.id} -- ${linkLabel} --> ${feed.link.recipe.dbData.id}`);
                } else {
                    // for output feeds that have no destination, create a dummy node
                    const dummyId = `out-${output.dbData.itemId}`;
                    const dummyLabel = JSON.stringify(
                        `${getItemById(output.dbData.itemId).name}\n${feed.calcData.solution} upm`,
                    );
                    statements.push(`${dummyId}[${dummyLabel}]`);
                    statements.push(`${recipe.dbData.id} --> ${dummyId}`);
                }
            }
        }
        for (const input of Object.values(recipe.inputs)) {
            for (const feed of input.feeds) {
                // inputs only need links if they are raw inputs
                if (!feed.link) {
                    const dummyId = `out-${input.dbData.itemId}`;
                    const dummyLabel = JSON.stringify(
                        `${getItemById(input.dbData.itemId).name}\n${feed.calcData.solution} upm`,
                    );
                    statements.push(`${dummyId}[${dummyLabel}]`);
                    statements.push(`${dummyId} --> ${recipe.dbData.id}`);
                }
            }
        }
    }
    return statements.join("\n");
}

export function ProductionGraph(props: Props) {
    const { desiredItem } = props;
    const [chartContainer, setChartContainer] = useState<HTMLElement | null>(null);

    const chartMarkup = useMemo(() => {
        return desiredItem ? buildChartMarkup(desiredItem) : "";
    }, [desiredItem]);

    useMermaidChart(chartContainer, chartMarkup);

    return <main css={{ pre: { flex: 1 } }} ref={setChartContainer} className="flex-1 p-8 overflow-hidden flex" />;
}
