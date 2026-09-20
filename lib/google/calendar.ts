// Google Calendar freeBusy 조회. 서버 전용 — token 값을 로그·응답에 담지 않는다.
import { google } from "googleapis";
import { authedClient } from "./oauth";
import type { BusyInterval, ISO } from "@/lib/types";

export async function fetchBusy(
  memberId: string,
  timeMin: ISO,
  timeMax: ISO
): Promise<BusyInterval[] | null> {
  const client = await authedClient(memberId);
  if (!client) return null;

  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: "Asia/Seoul",
        items: [{ id: "primary" }],
      },
    });

    const busy = data.calendars?.primary?.busy ?? [];
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: b.start as string, end: b.end as string }));
  } catch {
    console.error("[google/calendar] fetchBusy failed");
    return null;
  }
}
