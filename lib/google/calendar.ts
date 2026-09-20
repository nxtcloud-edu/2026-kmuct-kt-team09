// Google Calendar freeBusy 조회 및 이벤트 생성. 서버 전용 — token 값을 로그·응답에 담지 않는다.
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

/** Google Calendar 이벤트 생성 + Google Meet 링크 자동 생성 */
export async function createEvent(
  leaderMemberId: string,
  summary: string,
  description: string,
  start: ISO,
  end: ISO,
  attendeeEmails: string[]
): Promise<{ eventId: string; meetLink: string | null }> {
  const client = await authedClient(leaderMemberId);
  if (!client) {
    throw new Error("Leader not authenticated");
  }

  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const { data } = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1, // Google Meet 생성 활성화
      requestBody: {
        summary,
        description,
        start: { dateTime: start, timeZone: "Asia/Seoul" },
        end: { dateTime: end, timeZone: "Asia/Seoul" },
        attendees: attendeeEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `teamflow-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    return {
      eventId: data.id || "",
      meetLink: data.hangoutLink || data.conferenceData?.entryPoints?.[0]?.uri || null,
    };
  } catch (err) {
    console.error("[google/calendar] createEvent failed:", err);
    throw new Error("Failed to create calendar event");
  }
}
