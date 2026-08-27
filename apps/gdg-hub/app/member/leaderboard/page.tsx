import { PortalSettingsValueSchema } from "@hau/contracts";
import { getPortalSettings, listMemberLeaderboard } from "@hau/db";

export default async function LeaderboardPage() {
  const settingsResult = await getPortalSettings();
  const portal = PortalSettingsValueSchema.safeParse(
    settingsResult.data?.value,
  );
  const { data: rows, error } = await listMemberLeaderboard(
    portal.success ? portal.data.leaderboard_limit : 100,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gyrocoin leaderboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Active members ranked by current wallet balance. Equal balances share
          the same rank.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          The leaderboard could not be loaded. Apply and verify the Phase 10
          migration first.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-[5rem_1fr_7rem] border-b border-zinc-200 bg-zinc-100 px-4 py-3 text-xs font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-[5rem_1fr_8rem_8rem]">
            <span>Rank</span>
            <span>Member</span>
            <span className="text-right">Balance</span>
            <span className="hidden text-right sm:block">Earned</span>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(rows ?? []).map((row) => (
              <div
                key={row.member_id}
                className={`grid grid-cols-[5rem_1fr_7rem] items-center px-4 py-4 sm:grid-cols-[5rem_1fr_8rem_8rem] ${row.is_current_member ? "bg-blue-500/10" : ""}`}
              >
                <span className="text-lg font-bold">#{row.rank_position}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.full_name}</p>
                  <p className="text-xs text-zinc-500">
                    {row.gdg_id}
                    {row.is_current_member ? " · You" : ""}
                  </p>
                </div>
                <span className="text-right font-bold text-blue-500">
                  {Number(row.current_balance).toLocaleString()}
                </span>
                <span className="hidden text-right text-zinc-500 sm:block">
                  {Number(row.total_earned).toLocaleString()}
                </span>
              </div>
            ))}
            {!rows?.length && (
              <p className="p-10 text-center text-sm text-zinc-500">
                No active members are available.
              </p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Email, student ID, and transaction notes are never included in
        leaderboard results.
      </p>
    </div>
  );
}
