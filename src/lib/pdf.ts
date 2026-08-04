import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function buildPdfTableBuffer(
  title: string,
  columns: string[],
  rows: (string | number)[][]
): Buffer {
  const doc = new jsPDF({ orientation: rows.length && columns.length > 6 ? "landscape" : "portrait" });

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 21);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export function pdfResponseHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}
