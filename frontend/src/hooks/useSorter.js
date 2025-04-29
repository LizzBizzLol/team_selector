import { useState, useCallback } from "react";

export default function useSorter(defaultKey = "skill_name") {
  const [sort, setSort] = useState({ key: defaultKey, dir: "asc" });

  const sorted = useCallback(
    (arr) => {
      const mult = sort.dir === "asc" ? 1 : -1;
      return [...arr].sort((a, b) => {
        const v1 = a[sort.key];
        const v2 = b[sort.key];
        return typeof v1 === "number"
          ? (v1 - v2) * mult
          : v1.localeCompare(v2) * mult;
      });
    },
    [sort]
  );

  const toggle = (key) =>
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );

  return { sort, sorted, toggle };
}