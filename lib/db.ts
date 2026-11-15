import { promises as fs } from "fs";
import path from "path";

export type Attendee = {
  id: string;
  familiya: string;
  ism: string;
  otasiningIsmi: string;
  lavozim: string;
};

export type AttendanceRecord = {
  id: string;
  date: string; // YYYY-MM-DD (Asia/Tashkent)
  attendeeId: string;
  type: "self" | "substitute";
  substituteName?: string;
  substitutePosition?: string;
  deviceId: string;
  ip: string;
  createdAt: string;
};

export type Settings = {
  allowedIps: string[];
  title: string;
};

export type Database = {
  attendees: Attendee[];
  attendance: AttendanceRecord[];
  settings: Settings;
};

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "db.json");

const EMPTY: Database = {
  attendees: [],
  attendance: [],
  settings: { allowedIps: [], title: "Davomat tizimi" },
};

async function readRaw(): Promise<Database> {
  try {
    const txt = await fs.readFile(DB_PATH, "utf8");
    const data = JSON.parse(txt) as Partial<Database>;
    return {
      attendees: data.attendees ?? [],
      attendance: data.attendance ?? [],
      settings: { ...EMPTY.settings, ...(data.settings ?? {}) },
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeRaw(db: Database) {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

// Bir vaqtda kelgan yozuvlar bir-birini buzmasligi uchun navbat
let queue: Promise<unknown> = Promise.resolve();

export function readDb(): Promise<Database> {
  return readRaw();
}

export function updateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readRaw();
    const result = await fn(db);
    await writeRaw(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function newId() {
  return crypto.randomUUID();
}

export function fullName(a: Pick<Attendee, "familiya" | "ism" | "otasiningIsmi">) {
  return [a.familiya, a.ism, a.otasiningIsmi].filter(Boolean).join(" ");
}
