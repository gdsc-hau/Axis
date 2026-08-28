"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PublicMemberProfile } from "@hau/contracts";

function VerificationContent() {
  const token = useSearchParams().get("token");
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No verification token was provided.");
      return;
    }
    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Verification failed.");
        setProfile(body);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [token]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-8 text-center">
        {!profile && !error && <p>Verifying credential…</p>}
        {error && (
          <>
            <h1 className="text-2xl font-bold text-red-400">
              Verification failed
            </h1>
            <p className="mt-3 text-zinc-300">{error}</p>
          </>
        )}
        {profile && (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold">Verified GDG HAU member</h1>
            <dl className="mt-6 space-y-3 text-left">
              <div>
                <dt className="text-xs uppercase text-zinc-400">Name</dt>
                <dd>{profile.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-400">GDG ID</dt>
                <dd>{profile.gdgId}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-400">Program</dt>
                <dd>{profile.program}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-zinc-400">Email</dt>
                <dd>{profile.email}</dd>
              </div>
            </dl>
          </>
        )}
      </section>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
          <p>Loading verification…</p>
        </main>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
