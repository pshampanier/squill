import KeyboardShortcut from "@/components/core/KeyboardShortcut";
import PreviewBox from "../PreviewBox";

function Item({ shortcuts }: { shortcuts: [string, string] }) {
  return (
    <dl className="text-sm table-row">
      <dt className="table-cell text-right pr-1">
        <pre>{shortcuts[0]}</pre>
      </dt>
      <dd className="table-cell text-left">
        <KeyboardShortcut shortcuts={shortcuts} />
      </dd>
    </dl>
  );
}

export default function KeyboardShortcutPreview() {
  return (
    <PreviewBox title="KeyboardShortcut">
      <Item shortcuts={["Meta", "Ctrl"]} />
      <Item shortcuts={["Ctrl", "Ctrl"]} />
      <Item shortcuts={["Alt", "Ctrl"]} />
      <Item shortcuts={["Meta+K", "Ctrl"]} />
    </PreviewBox>
  );
}
