import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type SystemHealthRun =
  Database["public"]["Tables"]["system_health_runs"]["Row"];
export type SystemHealthResult =
  Database["public"]["Tables"]["system_health_results"]["Row"];

export async function getAdminSystemHealthData() {
  const supabase = await createServerClientInstance();
  const runsResult = await supabase
    .from("system_health_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10);

  const runs = (runsResult.data ?? []) as SystemHealthRun[];
  const latestRun = runs[0] ?? null;
  const resultsResult = latestRun
    ? await supabase
        .from("system_health_results")
        .select("*")
        .eq("run_id", latestRun.id)
        .order("sort_order", { ascending: true })
    : { data: [] as SystemHealthResult[], error: null };

  return {
    runs,
    latestRun,
    results: (resultsResult.data ?? []) as SystemHealthResult[],
    error: runsResult.error ?? resultsResult.error,
  };
}

export async function runSystemHealthCheck(args: {
  operationKey: string;
  applicationVersion: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("run_system_health_check", {
    p_operation_key: args.operationKey,
    p_application_version: args.applicationVersion,
  });
}
