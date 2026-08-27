import "server-only";
import { createAdminClient } from "@hau/db/admin";

const CERTIFICATE_BUCKET = "certificates";

export async function uploadCertificatePdf(
  storagePath: string,
  bytes: Uint8Array,
) {
  const supabase = createAdminClient();
  return supabase.storage.from(CERTIFICATE_BUCKET).upload(storagePath, bytes, {
    cacheControl: "3600",
    contentType: "application/pdf",
    upsert: true,
  });
}

export async function createCertificateDownloadUrl(
  storagePath: string,
  expiresInSeconds = 60,
) {
  const supabase = createAdminClient();
  return supabase.storage
    .from(CERTIFICATE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds, { download: true });
}

export async function removeCertificatePdf(storagePath: string) {
  const supabase = createAdminClient();
  return supabase.storage.from(CERTIFICATE_BUCKET).remove([storagePath]);
}
