"use client";

import { useState, useTransition } from "react";
import { saveCurrentMemberProfile } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

export function ProfileForm({
  version,
  bio,
  phoneNumber,
  linkedinUrl,
  githubUrl,
}: {
  version: number;
  bio: string;
  phoneNumber: string;
  linkedinUrl: string;
  githubUrl: string;
}) {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await saveCurrentMemberProfile(formData);
          if ("error" in result) {
            setMessage(result.error);
            return;
          }
          setMessage(`Profile saved as revision ${result.version}.`);
          setOperationKey(crypto.randomUUID());
        })
      }
      className="space-y-4"
    >
      <input type="hidden" name="expectedVersion" value={version} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-sm font-medium">
        Bio
        <textarea
          name="bio"
          required
          maxLength={1000}
          rows={5}
          defaultValue={bio}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Phone number (optional)
        <input
          name="phoneNumber"
          maxLength={30}
          defaultValue={phoneNumber}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        LinkedIn HTTPS URL (optional)
        <input
          name="linkedinUrl"
          type="url"
          maxLength={2048}
          defaultValue={linkedinUrl}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        GitHub HTTPS URL (optional)
        <input
          name="githubUrl"
          type="url"
          maxLength={2048}
          defaultValue={githubUrl}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Change reason
        <input
          name="reason"
          required
          minLength={3}
          maxLength={500}
          placeholder="Example: Updated contact details"
          className={inputClass}
        />
      </label>
      <button
        disabled={pending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
      <p className="min-h-5 text-sm text-zinc-500" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
