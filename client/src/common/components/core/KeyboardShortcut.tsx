import { isMacOS } from "@/utils/plateform";

type Props = {
  /**
   * The shortcuts to display. The first one is for macOS, the second one is for other OS.
   */
  shortcuts: [string, string];
};

/**
 * A trusted key is a key that can be safely displayed as HTML (here a key represented by it's HTML entity).
 */
type TrustedKey = [string, boolean];

export default function KeyboardShortcut({ shortcuts }: Props) {
  const shortcut = isMacOS() ? shortcuts[0] : shortcuts[1];
  const trustedKeys = shortcut.split("+").map((key): TrustedKey => {
    switch (key.toUpperCase()) {
      case "META":
        return ["&#8984;", true];
      case "CTRL":
        return ["&#8963;", true];
      case "ALT":
        return ["&#8997;", true];
      case "SHIFT":
        return ["&#8679;", true];
      case "ENTER":
        return ["&#8996;", true];
      case "ESC":
        return ["&#9099;", true];
      case "DELETE":
        return ["Delete", false];
      case "Space":
        return ["Space", false];
      default:
        return [key, false];
    }
  });
  return (
    <>
      {trustedKeys.map((key, index) => {
        if (key[1] /** trusted key */) {
          return <kbd key={index} className="mr-0.5" dangerouslySetInnerHTML={{ __html: key[0] }}></kbd>;
        } else {
          return (
            !key[1] && (
              <kbd key={index} className="mr-1">
                {key[0]}
              </kbd>
            )
          );
        }
      })}
    </>
  );
}
