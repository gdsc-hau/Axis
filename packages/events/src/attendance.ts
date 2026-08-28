export type AttendanceImportStatus =
  "REGISTERED" | "CHECKED_IN" | "CANCELLED" | "IGNORED";

export interface LumaAttendanceImportRow {
  row_number: number;
  email: string;
  registration_status: AttendanceImportStatus;
  registered_at: string | null;
  checked_in_at: string | null;
}

export interface ParsedLumaGuestCsv {
  rows: LumaAttendanceImportRow[];
  headers: string[];
}

const EMAIL_HEADERS = ["email", "email address", "guest email"];
const APPROVAL_HEADERS = [
  "approval status",
  "approval_status",
  "registration status",
  "registration_status",
  "guest status",
  "status",
];
const CHECKED_IN_AT_HEADERS = [
  "checked in at",
  "checked_in_at",
  "check in time",
  "check-in time",
  "checkin time",
];
const CHECKED_IN_HEADERS = [
  "checked in",
  "checked_in",
  "check in status",
  "check-in status",
  "checkin status",
];
const REGISTERED_AT_HEADERS = [
  "registration date",
  "registration time",
  "registered at",
  "registered_at",
  "created at",
  "created_at",
];

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function findHeader(headers: string[], aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  const index = headers.findIndex((header) =>
    normalizedAliases.has(normalizeHeader(header)),
  );
  return index >= 0 ? index : null;
}

function parseCsvRows(input: string) {
  if (input.includes("\0")) {
    throw new Error("The CSV contains an unsupported null character.");
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unterminated quoted field.");

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizedTimestamp(value: string, label: string, rowNumber: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  const timestamp = new Date(normalized);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`CSV row ${rowNumber} has an invalid ${label}.`);
  }
  return timestamp.toISOString();
}

function isCheckedIn(value: string) {
  return new Set(["1", "true", "yes", "y", "checked in", "checked-in"]).has(
    value.trim().toLowerCase(),
  );
}

function getImportStatus(
  approvalStatus: string,
  checkedInStatus: string,
  checkedInAt: string | null,
): AttendanceImportStatus {
  if (checkedInAt || isCheckedIn(checkedInStatus)) return "CHECKED_IN";

  const status = approvalStatus.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (
    ["declined", "not going", "cancelled", "canceled", "refunded"].includes(
      status,
    )
  ) {
    return "CANCELLED";
  }
  if (
    [
      "pending",
      "pending approval",
      "waitlist",
      "waitlisted",
      "invited",
    ].includes(status)
  ) {
    return "IGNORED";
  }
  return "REGISTERED";
}

const statusPriority: Record<AttendanceImportStatus, number> = {
  CHECKED_IN: 0,
  REGISTERED: 1,
  CANCELLED: 2,
  IGNORED: 3,
};

export function parseLumaGuestCsv(input: string): ParsedLumaGuestCsv {
  const csvRows = parseCsvRows(input);
  if (csvRows.length < 2) {
    throw new Error(
      "The Luma CSV must contain a header and at least one guest.",
    );
  }

  const headers = csvRows[0]!.map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );
  const emailIndex = findHeader(headers, EMAIL_HEADERS);
  const approvalIndex = findHeader(headers, APPROVAL_HEADERS);
  const checkedInAtIndex = findHeader(headers, CHECKED_IN_AT_HEADERS);
  const checkedInIndex = findHeader(headers, CHECKED_IN_HEADERS);
  const registeredAtIndex = findHeader(headers, REGISTERED_AT_HEADERS);

  if (emailIndex === null) {
    throw new Error("The Luma CSV does not contain a recognized email column.");
  }
  if (
    approvalIndex === null &&
    checkedInAtIndex === null &&
    checkedInIndex === null
  ) {
    throw new Error(
      "The Luma CSV needs an approval status or check-in column.",
    );
  }

  const rows = csvRows.slice(1).map((values, index) => {
    const rowNumber = index + 2;
    const email = (values[emailIndex] ?? "").trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`CSV row ${rowNumber} has an invalid email address.`);
    }

    const checkedInAt = normalizedTimestamp(
      checkedInAtIndex === null ? "" : (values[checkedInAtIndex] ?? ""),
      "check-in timestamp",
      rowNumber,
    );
    const registeredAt = normalizedTimestamp(
      registeredAtIndex === null ? "" : (values[registeredAtIndex] ?? ""),
      "registration timestamp",
      rowNumber,
    );
    const approvalStatus =
      approvalIndex === null ? "" : (values[approvalIndex] ?? "");
    const checkedInStatus =
      checkedInIndex === null ? "" : (values[checkedInIndex] ?? "");

    return {
      row_number: rowNumber,
      email,
      registration_status: getImportStatus(
        approvalStatus,
        checkedInStatus,
        checkedInAt,
      ),
      registered_at: registeredAt,
      checked_in_at: checkedInAt,
    } satisfies LumaAttendanceImportRow;
  });

  // Group registrations can repeat the same email once per ticket. Putting
  // checked-in rows first ensures the database keeps the strongest evidence
  // while still counting subsequent rows as duplicates.
  rows.sort(
    (left, right) =>
      statusPriority[left.registration_status] -
        statusPriority[right.registration_status] ||
      left.row_number - right.row_number,
  );

  if (rows.length > 5000) {
    throw new Error("Import no more than 5,000 Luma CSV rows at once.");
  }

  return { rows, headers };
}
