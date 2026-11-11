import { config, type Config } from "./config.ts";
import type { PathValue, Paths } from "./paths.ts";

export function getSetting<P extends Paths<Config>>(path: P): PathValue<Config, P> {
  let value: unknown = config;
  for (const key of path.split(".")) {
    value = (value as Record<string, unknown>)[key];
  }
  return value as PathValue<Config, P>;
}
