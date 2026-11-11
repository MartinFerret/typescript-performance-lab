// Every dot path in an object, for example "section0.group1.sub2.key3".
// Elegant, popular, and expensive: each call site re-explores the whole tree.
export type Paths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends readonly unknown[]
        ? K
        : T[K] extends object
          ? K | `${K}.${Paths<T[K]>}`
          : K;
    }[keyof T & string]
  : never;

export type PathValue<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? PathValue<T[Head], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;
