// utils/level01to05.js

// level01to05 — переводит уровень 0-1 (float) в 1-5 (int)
// 0 — если навык отсутствует или 0
export function level01to05(level01) {
    if (typeof level01 !== "number" || isNaN(level01) || level01 <= 0) return 0;
    return Math.max(1, Math.round(level01 * 5));
  }