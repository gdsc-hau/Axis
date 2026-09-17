"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  ImportGdgCommunityEventSchema,
  UpdateEventLumaUrlSchema,
} from "@hau/contracts";
import { setEventLumaUrl } from "@hau/db";
import {
  syncGdgCommunityChapter,
  syncGdgCommunityEventUrl,
} from "@/lib/gdg-community-sync";

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

function revalidateEventPages() {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/member/events");
}

export async function importGdgCommunityEvent(formData: FormData) {
  const parsed = ImportGdgCommunityEventSchema.safeParse({
    eventUrl: formData.get("eventUrl"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Enter a valid GDG Community URL.",
    };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  try {
    const outcome = await syncGdgCommunityEventUrl(parsed.data.eventUrl);
    revalidateEventPages();
    return { success: true, outcome };
  } catch (error) {
    console.error("GDG Community event import failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      error:
        error instanceof Error
          ? error.message
          : "The GDG Community event could not be imported.",
    };
  }
}

export async function syncGdgCommunityEvents() {
  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  try {
    const summary = await syncGdgCommunityChapter();
    revalidateEventPages();
    return { success: true, summary };
  } catch (error) {
    console.error("GDG Community chapter sync failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      error:
        error instanceof Error
          ? error.message
          : "GDG Community events could not be synchronized.",
    };
  }
}
