import type { Config } from "./config.ts";
import type { PathValue, Paths } from "./paths.ts";

// Same API, but the event name is built from P instead of looked up in a remapped type.
export function on<P extends Paths<Config>>(
  event: `${P}:changed`,
  handler: (value: PathValue<Config, P>) => void,
): void {
  console.log("listening to", event, handler.name);
}
