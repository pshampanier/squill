import ReactDOM from "react-dom/client";
import { App } from "../../common/components/App";

console.log("Hello from renderer");

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
