export const PLACEHOLDER_CERTIFICATE_TEMPLATE = "axis-placeholder-v1";

export interface CertificateTemplateData {
  certificateTitle: string;
  certificateNumber: string;
  memberName: string;
  memberGdgId: string;
  eventTitle: string;
  eventDate: string | null;
  verificationUrl: string;
}

export function formatCertificateEventDate(value: string | null) {
  if (!value) return "Event date not provided";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
