export function format(format: string, ...args: unknown[]): string {
  return format.replace(/{(\d+)}/g, (match, number) =>
    typeof args[number] != "undefined" ? (args[number] as string) : match,
  );
}
