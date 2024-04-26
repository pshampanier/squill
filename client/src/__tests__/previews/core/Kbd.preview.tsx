import PreviewBox from "../PreviewBox";
import Kbd from "@/components/core/Kbd";

export default function KBDPreview() {
  return (
    <PreviewBox>
      <ul className="flex flex-col">
        <li className="flex flex-col">
          <Kbd shortcut={"Meta+Alt+Shift+Ctrl"} />
          <Kbd shortcut={"Ctrl+Enter"} />
          <Kbd shortcut={"Esc"} />
        </li>
      </ul>
    </PreviewBox>
  );
}
