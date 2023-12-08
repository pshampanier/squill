import ReactDOM from "react-dom/client";
import { App } from "@/components/App";

import "@/assets/styles/main.css";

console.log("Hello from renderer");

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
