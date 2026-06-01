import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function generatePDF(
  element: HTMLElement,
  fileName: string
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const imageData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const width = 210;
  const height =
    (canvas.height * width) / canvas.width;

  pdf.addImage(
    imageData,
    "PNG",
    0,
    0,
    width,
    height
  );

  pdf.save(`${fileName}.pdf`);
}