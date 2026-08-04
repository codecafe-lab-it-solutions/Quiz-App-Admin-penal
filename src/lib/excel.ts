import * as XLSX from "xlsx";

/**
 * Parses an uploaded .xlsx/.csv file buffer into an array of row objects,
 * keyed by the first row's header labels.
 */
export function parseWorkbookRows<T = Record<string, unknown>>(buffer: ArrayBuffer | Buffer): T[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: "", raw: false });
}

/**
 * Builds an .xlsx file buffer from an array of plain row objects.
 * `headers` controls column order and labels.
 */
export function buildWorkbookBuffer(
  headers: { key: string; label: string }[],
  rows: Record<string, unknown>[],
  sheetName = "Sheet1"
): Buffer {
  const aoa: (string | number)[][] = [
    headers.map((h) => h.label),
    ...rows.map((row) => headers.map((h) => (row[h.key] ?? "") as string | number)),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function excelResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
