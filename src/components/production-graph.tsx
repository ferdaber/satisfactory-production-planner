import Dagre from "@dagrejs/dagre";
import { forceSimulation, forceCollide, forceLink, SimulationLinkDatum } from "d3-force";
import { useEffect, useState } from "react";
import { Item } from "../types/item";
import { solveProduction } from "../solver";
import { getBuildingById, getItemById } from "../data/db";
import ReactFlow, { Edge, MarkerType, Node, ReactFlowInstance, applyNodeChanges } from "reactflow";
import { ProductionNode, ProductionNodeData } from "./production-node";
import { ProductionEdge, ProductionEdgeData } from "./production-edge";

type Props = {
    desiredItem: Item | undefined;
};

const nodeTypes = {
    production: ProductionNode,
};

const edgeTypes = {
    production: ProductionEdge,
};

export function ProductionGraph(props: Props) {
    const { desiredItem } = props;
    const [elements, setElements] = useState<{ nodes: Node<ProductionNodeData>[]; edges: Edge<ProductionEdgeData>[] }>({
        nodes: [],
        edges: [],
    });
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<ProductionNodeData, {}>>();
    const [initialAnimationElements, setInitialAnimationElements] = useState(elements);

    useEffect(() => {
        if (!desiredItem) {
            setElements({ nodes: [], edges: [] });
            return;
        }
        const recipes = solveProduction(desiredItem.id, 100);
        const nodes: Node<ProductionNodeData>[] = [];
        const edges: Edge<ProductionEdgeData>[] = [];
        for (const recipe of recipes.slice().reverse()) {
            // define a node
            nodes.push({
                id: recipe.dbData.id,
                position: { x: 0, y: 0 },
                data: {
                    kind: "building",
                    model: getBuildingById(recipe.dbData.buildingId),
                    amount: recipe.buildingCalcData.solution,
                    recipe: recipe.dbData,
                },
            });

            // set outgoing links
            for (const output of Object.values(recipe.outputs)) {
                for (let feedIdx = 0; feedIdx < output.feeds.length; feedIdx++) {
                    const feed = output.feeds[feedIdx];
                    if (feed.link) {
                        if (feed.isRecycle) {
                            // if a feed is a recycle feed
                            const recycleNodeId = `recycle:${recipe.dbData.id}->${feed.link.recipe.dbData.id}`;
                            nodes.push({
                                id: recycleNodeId,
                                data: {
                                    kind: "item",
                                    model: getItemById(output.dbData.itemId),
                                    ioKind: "recycle",
                                    amount: feed.calcData.solution,
                                },
                                position: { x: 0, y: 0 },
                            });
                            edges.push({
                                id: `recycle-in:${recipe.dbData.id}->${feed.link.recipe.dbData.id}`,
                                source: recipe.dbData.id,
                                target: recycleNodeId,
                            });
                        } else {
                            edges.push({
                                id: `${recipe.dbData.id}->${feed.link.recipe.dbData.id}_${feedIdx}`,
                                source: recipe.dbData.id,
                                target: feed.link.recipe.dbData.id,
                                data: {
                                    amount: feed.calcData.solution,
                                    item: getItemById(output.dbData.itemId),
                                },
                            });
                        }
                    } else {
                        // for output feeds that have no destination, create a dummy node
                        const nodeId = `out:${output.dbData.itemId}`;
                        nodes.push({
                            id: nodeId,
                            data: {
                                kind: "item",
                                model: getItemById(output.dbData.itemId),
                                ioKind: "output",
                                amount: feed.calcData.solution,
                            },
                            position: { x: 0, y: 0 },
                        });
                        edges.push({
                            id: `out:${recipe.dbData.id}->${output.dbData.itemId}`,
                            source: recipe.dbData.id,
                            target: nodeId,
                        });
                    }
                }
            }
            for (const input of Object.values(recipe.inputs)) {
                for (const feed of input.feeds) {
                    // inputs only need links if they are raw inputs or recycles
                    if (!feed.link) {
                        const nodeId = `in:${input.dbData.itemId}`;
                        nodes.push({
                            id: nodeId,
                            data: {
                                kind: "item",
                                model: getItemById(input.dbData.itemId),
                                ioKind: "input",
                                amount: feed.calcData.solution,
                            },
                            position: {
                                x: 0,
                                y: 0,
                            },
                        });
                        edges.push({
                            id: `in:${input.dbData.itemId}->${recipe.dbData.id}`,
                            source: nodeId,
                            target: recipe.dbData.id,
                        });
                    } else if (feed.isRecycle) {
                        const recycleNodeId = `recycle:${feed.link.recipe.dbData.id}->${recipe.dbData.id}`;
                        edges.push({
                            id: `recycle-out:${feed.link.recipe.dbData.id}->${recipe.dbData.id}`,
                            source: recycleNodeId,
                            target: recipe.dbData.id,
                        });
                    }
                }
            }
        }

        const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
        g.setGraph({ rankdir: "LR" });
        nodes.forEach((node) =>
            g.setNode(node.id, { width: ProductionNode.DIAMETER * 2, height: ProductionNode.DIAMETER * 2 }),
        );
        edges.forEach((edge) => g.setEdge(edge.source, edge.target));
        Dagre.layout(g);

        const elements = {
            nodes: nodes.map((node) => {
                const { x, y } = g.node(node.id);
                return { ...node, type: "production", position: { x, y } };
            }),
            edges: edges.map((edge) => {
                return { ...edge, type: "production", markerEnd: { type: MarkerType.ArrowClosed } };
            }),
        };
        setElements(elements);
        window.setTimeout(() => {
            reactFlowInstance?.fitView({ maxZoom: 1.5, minZoom: 0.75, duration: 160 });
        }, 16);
    }, [desiredItem, reactFlowInstance]);

    useEffect(() => {
        if (!initialAnimationElements.nodes.length) return;

        const simulatedNodes = initialAnimationElements.nodes.map((node) => ({
            x: node.position.x,
            y: node.position.y,
            id: node.id,
            node,
        }));
        type SimulatedNode = (typeof simulatedNodes)[number];
        const simulation = forceSimulation(simulatedNodes)
            // .force("charge", forceManyBody().strength(-100))
            .force("collide", forceCollide(50))
            .force(
                "link",
                forceLink<SimulatedNode, SimulationLinkDatum<SimulatedNode>>(
                    initialAnimationElements.edges.map((edge) => ({ source: edge.source, target: edge.target })),
                )
                    .id((node) => node.id)
                    .distance(75),
            )
            .stop();

        let aborted = false;
        const tick = () => {
            if (aborted || simulation.alpha() < 0.05) {
                return;
            }
            simulation.tick();
            setElements((elements) => ({
                ...elements,
                nodes: simulation.nodes().map((node) => ({
                    ...node.node,
                    position: { x: node.x, y: node.y },
                })),
            }));
            window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
        return () => {
            aborted = true;
        };
    }, [initialAnimationElements]);

    // const [chartContainer, setChartContainer] = useState<HTMLElement | null>(null);

    // const chartMarkup = useMemo(() => {
    //     return desiredItem ? buildChartMarkup(desiredItem) : "";
    // }, [desiredItem]);

    // useMermaidChart(chartContainer, chartMarkup);

    // return <main css={{ pre: { flex: 1 } }} ref={setChartContainer} className="flex-1 p-8 overflow-hidden flex" />;
    return (
        <main css={{ pre: { flex: 1 } }} className="flex-1 p-8 overflow-clip flex">
            <ReactFlow
                nodes={elements.nodes}
                edges={elements.edges}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={(changes) => {
                    const positionChanges = changes.filter((change) => change.type === "position");
                    if (positionChanges.length) {
                        setElements((elements) => ({
                            ...elements,
                            nodes: applyNodeChanges(positionChanges, elements.nodes),
                        }));
                    }
                }}
                nodesConnectable={false}
                nodesFocusable={false}
                edgesFocusable={false}
                elementsSelectable={false}
                nodesDraggable={true}
                panOnDrag={[2]}
                zoomOnDoubleClick={false}
                proOptions={{ hideAttribution: true }}
            />
        </main>
    );
}
