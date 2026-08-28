import { NextResponse } from "next/server";
import { createCertificateDownloadUrl } from "@hau/certificates";
import { getAuthorizedCertificate } from "@hau/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      certificateId,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid certificate." },
      { status: 400 },
    );
  }

  const { data: certificate, error } =
    await getAuthorizedCertificate(certificateId);
  if (error || !certificate) {
    return NextResponse.json(
      { error: "Certificate not found." },
      { status: 404 },
    );
  }
  if (certificate.status !== "ISSUED" || !certificate.storage_path) {
    return NextResponse.json(
      { error: "This certificate is not available for download." },
      { status: 409 },
    );
  }

  const { data, error: signedUrlError } = await createCertificateDownloadUrl(
    certificate.storage_path,
    60,
  );
  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      { error: "The private download link could not be created." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(data.signedUrl, { status: 307 });
}
