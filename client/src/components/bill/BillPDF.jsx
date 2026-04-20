import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportBillPdf(element, filename = "bill.pdf") {
  const canvas = await html2canvas(element);
  const image = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const width = 190;
  const height = (canvas.height * width) / canvas.width;
  pdf.addImage(image, "PNG", 10, 10, width, height);
  pdf.save(filename);
}

export default function BillPDF() {
  return null;
}

