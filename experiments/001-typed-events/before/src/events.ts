import type { Config } from "./config.ts";
import type { PathValue, Paths } from "./paths.ts";

// One event per setting, for example "section0.group1.sub2.key3:changed".
export type SettingsEvents = {
  [P in Paths<Config> as `${P}:changed`]: (value: PathValue<Config, P>) => void;
};

export function on<E extends keyof SettingsEvents>(event: E, handler: SettingsEvents[E]): void {
  console.log("listening to", event, handler.name);
}
