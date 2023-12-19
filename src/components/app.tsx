import { useState } from "react";
import { ProductionGraph } from "./production-graph";
import { Sidebar } from "./sidebar";
import { Item } from "../types/item";

type Props = {};

export function App(props: Props) {
    const [desiredItem, setDesiredItem] = useState<Item>();
    return (
        <>
            <Sidebar onChooseItem={setDesiredItem} />
            <ProductionGraph desiredItem={desiredItem} />
        </>
    );
}
