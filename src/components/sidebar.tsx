import { createRef, useEffect, useState } from "react";
import { ITEMS } from "../data/items";
import { Item } from "../types/item";

const ITEMS_ENTRIES = Object.values(ITEMS).filter((item) => !item.isRawInput);

type Props = {
    onChooseItem: (item: Item) => void;
};

export function Sidebar(props: Props) {
    const { onChooseItem } = props;
    const [searchQuery, setSearchQuery] = useState("");
    const searchRef = createRef<HTMLInputElement>();

    useEffect(() => {
        const listener = (ev: KeyboardEvent) => {
            if (document.activeElement === document.body && ev.key === "/") {
                ev.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener("keypress", listener);
        return () => {
            document.removeEventListener("keypress", listener);
        };
    }, [searchRef]);

    return (
        <aside className="min-w-[320px] bg-stone-800 p-3 flex flex-col">
            <h2 className="text-center text-2xl my-4">Production Solver</h2>
            <input
                ref={searchRef}
                className="bg-stone-100 text-stone-950 placeholder-stone-500 text-sm py-1 px-2 rounded-sm self-stretch"
                placeholder="Search for an item..."
                value={searchQuery}
                onChange={(ev) => setSearchQuery(ev.target.value)}
            />
            <ul
                className="flex-1 overflow-y-auto snap-y mt-4 flex flex-col space-y-2"
                css={{ [`&::-webkit-scrollbar`]: { display: "none" } }}
            >
                {ITEMS_ENTRIES.filter(
                    (item) =>
                        !searchQuery ||
                        item.name
                            .toLowerCase()
                            .split(/\s+/)
                            .some((s) => s.startsWith(searchQuery.toLowerCase())),
                ).map((item) => (
                    <li className="snap-start" key={item.id}>
                        <button
                            onClick={() => onChooseItem(item)}
                            className={
                                "flex w-full items-center px-4 py-1 bg-stone-700 rounded-md text-sm " +
                                "shadow-lg border border-stone-900 text-stone-200 transition-[background,color,transform] !outline-0 " +
                                "hover:text-stone-100 hover:bg-stone-600 focus:text-stone-100 focus:bg-stone-600 " +
                                "active:scale-[98%]"
                            }
                        >
                            <img className="h-8" src={item.imgUrl} />
                            <span className="flex-1">{item.name}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </aside>
    );
}
