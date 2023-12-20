import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/app";
import { Global, css } from "@emotion/react";
import "./index.css";
// import mermaid from "mermaid";

// mermaid.initialize({ startOnLoad: false });

ReactDOM.createRoot(document.getElementById("root")!).render(
    <>
        <Global
            styles={css`
                :root {
                    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
                    color-scheme: light dark;
                    font-synthesis: none;
                    text-rendering: optimizeLegibility;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                body {
                    margin: 0;
                    display: flex;
                    height: 100vh;
                    overflow: auto;
                }

                #root {
                    display: flex;
                    flex: 1;
                    align-self: stretch;
                }
            `}
        />
        <App />
    </>,
);
