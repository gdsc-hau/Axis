"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import { RunSystemHealthCheckSchema } from "@hau/contracts";
import { runSystemHealthCheck } from "@hau/db";

export async function executeSystemHealthCheck(formData: FormData) {
  const parsed = RunSystemHealthCheckSchema.safeParse({
    operationKey: formData.get("operationKey"),
    applicationVersion: formData.get("applicationVersion"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid health-check request.",
    };
  }
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }

  const { data, error } = await runSystemHealthCheck(parsed.data);
  if (error || !data) {
    return {
      error: error?.message ?? "The system health check failed to run.",
    };
  }

  revalidatePath("/admin/system");
  return {
    success: true,
    status: data.status,
    failedChecks: data.failed_checks,
    warningChecks: data.warning_checks,
  };
}
