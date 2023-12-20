import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Building } from "../types/building";
import { Item } from "../types/item";
import { cx } from "../cx";
import { Fraction } from "../math/fractions";
import { Recipe } from "../types/recipe";

export type ProductionNodeData =
    | {
          kind: "building";
          model: Building;
          amount: Fraction;
          recipe: Recipe;
      }
    | {
          kind: "item";
          model: Item;
          amount: Fraction;
          ioKind: "input" | "output" | "recycle";
      };

export function ProductionNode(props: NodeProps<ProductionNodeData>) {
    const { data } = props;
    return (
        <div className="relative">
            {data.kind === "building" && (
                <div
                    css={{
                        maxWidth: ProductionNode.DIAMETER * 2,
                    }}
                    className={`text-white text-center min-w-full absolute bottom-full left-1/2 -translate-y-1 -translate-x-1/2 text-xs`}
                >
                    <div className="text-[10px]/[1.2]">
                        <a
                            className="nopan hover:underline hover:text-sky-500"
                            href={data.recipe.wikiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onMouseDownCapture={(ev) => {
                                ev.stopPropagation();
                            }}
                        >
                            {data.recipe.name}
                        </a>
                    </div>
                </div>
            )}
            <div
                css={{
                    height: ProductionNode.DIAMETER,
                    width: ProductionNode.DIAMETER,
                }}
                className={cx(
                    `rounded-full overflow-hidden bg-stone-700 p-1 border-2 border-opacity-75`,
                    data.kind === "building"
                        ? "border-white"
                        : data.ioKind === "input"
                          ? "border-blue-400"
                          : data.ioKind === "output"
                            ? "border-green-400"
                            : "border-purple-500",
                )}
            >
                <img src={data.model.imgUrl} className="w-full h-full" />
                <Handle
                    className={
                        "h-[1px] w-[1px] min-w-0 min-h-0 border-0 invisible" +
                        " top-1/2 left-1/2 right-auto bottom-auto -translate-x-1/2 -translate-y-1/2"
                    }
                    type="source"
                    position={Position.Right}
                />
                <Handle
                    className={
                        "h-[1px] w-[1px] min-w-0 min-h-0 border-0 invisible" +
                        " top-1/2 left-1/2 right-auto bottom-auto -translate-x-1/2 -translate-y-1/2"
                    }
                    type="target"
                    position={Position.Left}
                />
            </div>
            <div
                css={{
                    maxWidth: ProductionNode.DIAMETER * 2,
                }}
                className={`text-white text-center min-w-full absolute top-full left-1/2 translate-y-1 -translate-x-1/2 text-xs`}
            >
                <div className="whitespace-nowrap">
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
                <div className="text-[10px]/[1.2]">
                    <a
                        className="nopan hover:underline hover:text-sky-500"
                        href={data.model.wikiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseDownCapture={(ev) => {
                            ev.stopPropagation();
                        }}
                    >
                        <strong>{data.model.name}</strong>
                    </a>
                </div>
            </div>
        </div>
    );
}

ProductionNode.DIAMETER = 50;
