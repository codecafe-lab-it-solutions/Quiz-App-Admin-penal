interface CourseCatalogRow {
  subCode: string;
  title: string | null;
}

// The faculty course-catalog API (/api/faculty/courses) returns one row per
// branch a faculty teaches a code under - the admin mapping picker needs
// that per-branch granularity to disambiguate which row to link, so the API
// itself can't collapse it. Every other consumer just wants a flat "pick a
// course" list, so a shared course across branches (or a code with a
// curriculum row under only some branches) would otherwise show as several
// near-identical entries. This collapses to one entry per code, preferring
// a row that actually resolved a title over one that fell back to null.
export function dedupeByCourseCode<T extends CourseCatalogRow>(items: T[]): T[] {
  const byCode = new Map<string, T>();
  for (const item of items) {
    const existing = byCode.get(item.subCode);
    if (!existing || (!existing.title && item.title)) {
      byCode.set(item.subCode, item);
    }
  }
  return [...byCode.values()];
}
