import PreviewBox from "../PreviewBox";
import KBD from "@/components/core/KBD";

export default function KBDPreview() {
  return (
    <PreviewBox title="KeyboardShortcut">
      <ul className="flex flex-col">
        <li className="flex flex-col">
          <KBD shortcut={"Meta+Alt+Shift+Ctrl"} />
          <KBD shortcut={"Ctrl+Enter"} />
          <KBD shortcut={"Esc"} />
        </li>
      </ul>
    </PreviewBox>
  );
}
