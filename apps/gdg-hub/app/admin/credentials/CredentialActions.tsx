"use client";

import { useRef, useState, useTransition } from "react";
import {
  awardBadge,
  awardEventBadge,
  createBadge,
  issueCertificateBatch,
  revokeBadge,
  revokeCertificate,
} from "./actions";

type Option = { id: string; label: string };
type Message = { kind: "success" | "error"; text: string } | undefined;

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

function useCredentialAction() {
  const [message, setMessage] = useState<Message>();
  const [isPending, startTransition] = useTransition();

  function run(
    action: (data: FormData) => Promise<Record<string, unknown>>,
    data: FormData,
    successText: (result: Record<string, unknown>) => string,
    reset?: () => void,
  ) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await action(data);
      if ("error" in result) {
        setMessage({ kind: "error", text: String(result.error) });
        return;
      }
      setMessage({ kind: "success", text: successText(result) });
      reset?.();
    });
  }

  return { message, isPending, run };
}

function Result({ message }: { message: Message }) {
  return (
    <p
      aria-live="polite"
      className={`min-h-4 text-xs ${
        message?.kind === "error" ? "text-red-500" : "text-emerald-600"
      }`}
    >
      {message?.text}
    </p>
  );
}

export function BadgeCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const action = useCredentialAction();
  return (
    <form
      ref={formRef}
      action={(data) =>
        action.run(
          createBadge,
          data,
          () => "Badge created.",
          () => formRef.current?.reset(),
        )
      }
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Badge name
          <input name="name" required maxLength={120} className={inputClass} />
        </label>
        <label className="text-xs font-medium">
          Slug
          <input
            name="slug"
            required
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="event-champion"
            className={inputClass}
          />
        </label>
      </div>
      <label className="block text-xs font-medium">
        Description
        <textarea
          name="description"
          maxLength={1000}
          rows={2}
          className={inputClass}
        />
      </label>
      <label className="block text-xs font-medium">
        HTTPS icon URL (optional)
        <input
          name="iconUrl"
          type="url"
          maxLength={2000}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="active" type="checkbox" defaultChecked /> Active
      </label>
      <button
        disabled={action.isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {action.isPending ? "Creating..." : "Create badge"}
      </button>
      <Result message={action.message} />
    </form>
  );
}

export function ManualBadgeAwardForm({
  badges,
  members,
}: {
  badges: Option[];
  members: Option[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const action = useCredentialAction();
  return (
    <form
      ref={formRef}
      action={(data) =>
        action.run(
          awardBadge,
          data,
          () => "Badge awarded.",
          () => {
            formRef.current?.reset();
            setOperationKey(crypto.randomUUID());
          },
        )
      }
      className="space-y-3"
    >
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-xs font-medium">
        Active member
        <select name="memberId" required className={inputClass}>
          <option value="">Select member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Active badge
        <select name="badgeId" required className={inputClass}>
          <option value="">Select badge</option>
          {badges.map((badge) => (
            <option key={badge.id} value={badge.id}>
              {badge.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Award reason
        <input
          name="reason"
          required
          minLength={3}
          maxLength={500}
          className={inputClass}
        />
      </label>
      <button
        disabled={action.isPending || !badges.length || !members.length}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {action.isPending ? "Awarding..." : "Award badge"}
      </button>
      <Result message={action.message} />
    </form>
  );
}

export function EventCredentialForms({
  badges,
  events,
}: {
  badges: Option[];
  events: Option[];
}) {
  const [badgeKey, setBadgeKey] = useState(() => crypto.randomUUID());
  const [certificateKey, setCertificateKey] = useState(() =>
    crypto.randomUUID(),
  );
  const badgeAction = useCredentialAction();
  const certificateAction = useCredentialAction();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        action={(data) =>
          badgeAction.run(
            awardEventBadge,
            data,
            (result) =>
              `${result.awardedCount ?? 0} awarded; ${result.skippedCount ?? 0} skipped.`,
            () => setBadgeKey(crypto.randomUUID()),
          )
        }
        className="space-y-3"
      >
        <h3 className="font-semibold">Award badge to confirmed attendees</h3>
        <input type="hidden" name="operationKey" value={badgeKey} />
        <label className="block text-xs font-medium">
          Event
          <select name="eventId" required className={inputClass}>
            <option value="">Select event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Badge
          <select name="badgeId" required className={inputClass}>
            <option value="">Select badge</option>
            {badges.map((badge) => (
              <option key={badge.id} value={badge.id}>
                {badge.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Award reason
          <input
            name="reason"
            required
            minLength={3}
            maxLength={500}
            className={inputClass}
          />
        </label>
        <button
          disabled={badgeAction.isPending || !badges.length || !events.length}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {badgeAction.isPending ? "Awarding..." : "Run badge batch"}
        </button>
        <Result message={badgeAction.message} />
      </form>

      <form
        action={(data) =>
          certificateAction.run(
            issueCertificateBatch,
            data,
            (result) =>
              `${result.issuedCount ?? 0} issued; ${result.failedCount ?? 0} failed.`,
            () => setCertificateKey(crypto.randomUUID()),
          )
        }
        className="space-y-3"
      >
        <h3 className="font-semibold">
          Issue certificates to confirmed attendees
        </h3>
        <input type="hidden" name="operationKey" value={certificateKey} />
        <input
          type="hidden"
          name="templateVersion"
          value="axis-placeholder-v1"
        />
        <label className="block text-xs font-medium">
          Event
          <select name="eventId" required className={inputClass}>
            <option value="">Select event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium">
          Certificate title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue="Certificate of Participation"
            className={inputClass}
          />
        </label>
        <p className="text-xs text-amber-600 dark:text-amber-300">
          This generates the Phase 7 placeholder PDF. Email delivery is not
          active yet.
        </p>
        <button
          disabled={certificateAction.isPending || !events.length}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {certificateAction.isPending
            ? "Generating PDFs..."
            : "Issue certificate batch"}
        </button>
        <Result message={certificateAction.message} />
      </form>
    </div>
  );
}

export function RevokeBadgeForm({ awardId }: { awardId: string }) {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const action = useCredentialAction();
  return (
    <form
      action={(data) =>
        action.run(
          revokeBadge,
          data,
          () => "Badge revoked.",
          () => setOperationKey(crypto.randomUUID()),
        )
      }
      className="mt-2 flex gap-2"
    >
      <input type="hidden" name="memberBadgeId" value={awardId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <input
        name="reason"
        required
        minLength={3}
        maxLength={500}
        placeholder="Revocation reason"
        className={inputClass}
      />
      <button
        disabled={action.isPending}
        className="self-end rounded-lg border border-red-500 px-3 py-2 text-xs text-red-500 disabled:opacity-60"
      >
        Revoke
      </button>
    </form>
  );
}

export function RevokeCertificateForm({
  certificateId,
}: {
  certificateId: string;
}) {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const action = useCredentialAction();
  return (
    <form
      action={(data) =>
        action.run(
          revokeCertificate,
          data,
          () => "Certificate revoked.",
          () => setOperationKey(crypto.randomUUID()),
        )
      }
      className="mt-2 flex gap-2"
    >
      <input type="hidden" name="certificateId" value={certificateId} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <input
        name="reason"
        required
        minLength={3}
        maxLength={500}
        placeholder="Revocation reason"
        className={inputClass}
      />
      <button
        disabled={action.isPending}
        className="self-end rounded-lg border border-red-500 px-3 py-2 text-xs text-red-500 disabled:opacity-60"
      >
        Revoke
      </button>
    </form>
  );
}
