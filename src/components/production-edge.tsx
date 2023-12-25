import { BaseEdge, EdgeLabelRenderer, EdgeProps, getStraightPath } from "reactflow";
import { ProductionNode } from "./production-node";
import { Item } from "../types/item";
import { Fraction } from "../math/fraction";

export interface ProductionEdgeData {
    item: Item;
    amount: Fraction;
}

export function ProductionEdge(props: EdgeProps<ProductionEdgeData>) {
    const { id, sourceX, sourceY, targetX, targetY, markerEnd, data } = props;
    const theta = Math.atan(Math.abs(targetY - sourceY) / Math.abs(targetX - sourceX));
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    // in this coordinate system, (0, 0) is the top-left corner
    const xDirection = Math.sign(targetX - sourceX);
    const yDirection = Math.sign(targetY - sourceY);
    const [path, labelX, labelY] = getStraightPath({
        sourceX: sourceX + (xDirection * cos * ProductionNode.DIAMETER) / 2,
        sourceY: sourceY + (yDirection * sin * ProductionNode.DIAMETER) / 2,
        targetX: targetX - (xDirection * cos * ProductionNode.DIAMETER) / 2,
        targetY: targetY - (yDirection * sin * ProductionNode.DIAMETER) / 2,
    });
    const labelRotation = `${xDirection * yDirection < 0 ? "-" : ""}${theta}rad`;
    return (
        <>
            <BaseEdge id={id} path={path} markerEnd={markerEnd} />
            <EdgeLabelRenderer>
                {data && (
                    <div
                        className="absolute text-[10px]/[1.5] text-center italic"
                        style={{
                            transform: `translate(-50%, -50%) translateX(${labelX}px) translateY(${labelY}px) rotate(${labelRotation})`,
                        }}
                    >
                        <a
                            className="pointer-events-auto flex space-x-1 items-center hover:underline hover:text-sky-500"
                            href={data.item.wikiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <img src={data.item.imgUrl} className="w-[10px] h-[10px]" />
                            <span>{data.item.name}</span>
                        </a>
                        <div>
                            {data.amount.denominator === 1 ? (
                                data.amount.toString() + "×"
                            ) : (
                                <>
                                    <sup>{data.amount.numerator}</sup>&frasl;<sub>{data.amount.denominator}</sub>
                                    {"× "}
                                    {`(~${data.amount.valueOf().toFixed(2)})`}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
