// Type safety proof for the "after" version: every line below must fail to compile.
import { on } from "./after/src/events.ts";

// @ts-expect-error key1 is a number, not a string
on("section0.group0.sub0.key1:changed", (value: string) => console.log(value));

// @ts-expect-error this setting does not exist
on("section9.nope:changed", () => {});
