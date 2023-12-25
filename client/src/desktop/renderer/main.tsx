import ReactDOM from "react-dom/client";
import { App } from "@/components/App";

import "@/utils/monaco-workers";
import "@/assets/styles/main.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

console.log(`${new Date().toISOString()}: renderer executed`);
