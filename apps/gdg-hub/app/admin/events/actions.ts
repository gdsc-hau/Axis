"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import { UpdateEventLumaUrlSchema } from "@hau/contracts";
import { setEventLumaUrl } from "@hau/db";

export async function updateEventLumaUrl(formData: FormData) {
  const parsed = UpdateEventLumaUrlSchema.safeParse({
    eventId: formData.get("eventId"),
    lumaUrl: formData.get("lumaUrl"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid Luma URL request.",
    };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const { error } = await setEventLumaUrl(
    parsed.data.eventId,
    parsed.data.lumaUrl,
  );
  if (error) {
    return { error: "Failed to update the Luma URL: " + error.message };
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/member/events/${parsed.data.eventId}`);
  return { success: true };
}
