import { jsPDF } from "jspdf";
import {
  formatCertificateEventDate,
  type CertificateTemplateData,
} from "./template";

function centeredText(document: jsPDF, text: string, y: number) {
  document.text(text, document.internal.pageSize.getWidth() / 2, y, {
    align: "center",
  });
}

export function generateCertificatePdf(data: CertificateTemplateData) {
  const document = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const width = document.internal.pageSize.getWidth();
  const height = document.internal.pageSize.getHeight();

  document.setFillColor(7, 9, 13);
  document.rect(0, 0, width, height, "F");
  document.setDrawColor(66, 133, 244);
  document.setLineWidth(1.2);
  document.rect(10, 10, width - 20, height - 20);
  document.setDrawColor(52, 168, 83);
  document.setLineWidth(0.4);
  document.rect(14, 14, width - 28, height - 28);

  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(15);
  centeredText(document, "GOOGLE DEVELOPERS GROUP", 31);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  centeredText(document, "On Campus - Holy Angel University", 39);

  document.setTextColor(66, 133, 244);
  document.setFont("helvetica", "bold");
  document.setFontSize(29);
  centeredText(document, "CERTIFICATE OF RECOGNITION", 65);

  document.setTextColor(210, 214, 220);
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  centeredText(document, "This placeholder certificate is presented to", 81);

  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(24);
  centeredText(document, data.memberName, 101);
  document.setDrawColor(251, 188, 4);
  document.setLineWidth(0.6);
  document.line(68, 108, width - 68, 108);

  document.setTextColor(210, 214, 220);
  document.setFont("helvetica", "normal");
  document.setFontSize(11);
  centeredText(document, data.certificateTitle, 122);

  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "bold");
  document.setFontSize(16);
  const eventLines = document.splitTextToSize(data.eventTitle, width - 80);
  document.text(eventLines, width / 2, 136, { align: "center" });

  document.setTextColor(210, 214, 220);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  centeredText(document, formatCertificateEventDate(data.eventDate), 157);
  centeredText(document, `GDG ID: ${data.memberGdgId}`, 166);

  document.setTextColor(145, 150, 160);
  document.setFontSize(8);
  document.text(`Certificate: ${data.certificateNumber}`, 20, height - 30);
  const verificationLines = document.splitTextToSize(
    `Verify: ${data.verificationUrl}`,
    90,
  );
  document.text(verificationLines, width - 110, height - 34);
  document.text(
    "Placeholder template - final artwork pending",
    width / 2,
    height - 16,
    { align: "center" },
  );

  return new Uint8Array(document.output("arraybuffer"));
}
