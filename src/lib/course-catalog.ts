interface CourseCatalogRow {
  subCode: string;
  title: string | null;
}

// True only when this row has a real title, distinct from its own code.
// getFacultyCourseCatalog falls back to the bare code as "title" when
// neither isr_curriculum_tbl nor the app's own Course catalog has a real
// name for it (e.g. SM304 - a real faculty assignment exists in
// isr_sub_available_tbl, but the code was never entered into the curriculum
// table for that semester by whoever owns that source data). Filtering
// these out of pickers avoids showing a course as "SM304 (SM304)" - it
// reappears on its own once a real title is added upstream.
export function hasRealTitle(item: CourseCatalogRow): boolean {
  return !!item.title && item.title !== item.subCode;
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
