import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import Kbd from "@/components/core/Kbd";

export default function KBDPreview() {
  return (
    <PreviewBox>
      <Preview.Title>Types</Preview.Title>
      <Preview.Description>Dropdown exists in 3 variants.</Preview.Description>
      <div className="grid grid-cols-3 min-w-fit w-96 overflow-hidden gap-y-2">
        <div className="min-w-0 font-bold">size=&quot;xs&quot;</div>
        <ul className="min-w-0  text-xs">
          <li className="flex flex-col space-y-1">
            <Kbd size="xs" shortcut={"Meta+Alt+Shift+Ctrl"} />
            <Kbd size="xs" shortcut={"Ctrl+Enter"} />
            <Kbd size="xs" shortcut={"Esc"} />
          </li>
        </ul>
        <div className="min-w-0 text-xs">
          <div className="inline-flex min-w-0 items-center whitespace-nowrap">
            Press <Kbd size="xs" shortcut="Enter" /> or
            <Kbd size="xs" shortcut="Meta+Enter" />
          </div>
        </div>
        <div className="min-w-0 font-bold">size=&quot;sm&quot;</div>
        <ul className="min-w-0 text-sm">
          <li className="flex flex-col space-y-1">
            <Kbd size="sm" shortcut={"Meta+Alt+Shift+Ctrl"} />
            <Kbd size="sm" shortcut={"Ctrl+Enter"} />
            <Kbd size="sm" shortcut={"Esc"} />
          </li>
        </ul>
        <div className="min-w-0  text-sm">
          <div className="inline-flex min-w-0 items-center whitespace-nowrap">
            Press <Kbd size="sm" shortcut="Enter" /> or
            <Kbd size="sm" shortcut="Meta+Enter" />
          </div>
        </div>
      </div>
    </PreviewBox>
  );
}
