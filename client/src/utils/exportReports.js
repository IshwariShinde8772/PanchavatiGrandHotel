import jsPDF from "jspdf";
import { formatISTDateTimeForReport } from "./hotelDate";

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportTableExcel({ title, columns, rows, filename }) {
  const header = columns.map((column) => `<th>${escapeCell(column.header)}</th>`).join("");
  const body = rows.map((row) => (
    `<tr>${columns.map((column) => `<td>${escapeCell(column.value(row))}</td>`).join("")}</tr>`
  )).join("");
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <h2>${escapeCell(title)}</h2>
        <p>Generated: ${escapeCell(formatISTDateTimeForReport(new Date()))}</p>
        <table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
      </body>
    </html>`;

  downloadBlob(html, "application/vnd.ms-excel", filename);
}

export function printTable({
  title,
  columns,
  rows,
  filters = {},
  printWindow = window.open("", "_blank"),
}) {
  if (!printWindow) return false;

  const header = columns.map((column) => `<th>${escapeCell(column.header)}</th>`).join("");
  const body = rows.map((row) => (
    `<tr>${columns.map((column) => `<td>${escapeCell(column.value(row))}</td>`).join("")}</tr>`
  )).join("");
  const filterText = Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeCell(title)}</title>
        <style>
          body { color: #111827; font-family: Arial, sans-serif; margin: 24px; }
          h1 { font-size: 20px; margin: 0 0 6px; }
          p { color: #4b5563; font-size: 11px; margin: 0 0 12px; }
          table { border-collapse: collapse; font-size: 10px; width: 100%; }
          th, td { border: 1px solid #d1d5db; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          @page { margin: 12mm; size: landscape; }
        </style>
      </head>
      <body>
        <h1>${escapeCell(title)}</h1>
        <p>Generated: ${escapeCell(formatISTDateTimeForReport(new Date()))}</p>
        ${filterText ? `<p>Filters: ${escapeCell(filterText)}</p>` : ""}
        <table>
          <thead><tr>${header}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.addEventListener("afterprint", () => printWindow.close(), { once: true });
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
  return true;
}

export function exportTablePdf({ title, columns, rows, filename, filters = {} }) {
  const pdf = new jsPDF("l", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const colWidth = usableWidth / columns.length;
  let y = 12;

  pdf.setFontSize(14);
  pdf.text(title, margin, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.text(`Generated: ${formatISTDateTimeForReport(new Date())}`, margin, y);
  y += 5;
  const filterText = Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(", ");
  if (filterText) {
    pdf.text(`Filters: ${filterText}`, margin, y);
    y += 6;
  }

  pdf.setFontSize(8);
  columns.forEach((column, index) => {
    pdf.text(String(column.header), margin + index * colWidth, y, { maxWidth: colWidth - 2 });
  });
  y += 5;

  rows.forEach((row) => {
    if (y > 195) {
      pdf.addPage();
      y = 12;
    }
    columns.forEach((column, index) => {
      pdf.text(String(column.value(row) ?? ""), margin + index * colWidth, y, { maxWidth: colWidth - 2 });
    });
    y += 6;
  });

  pdf.save(filename);
}
