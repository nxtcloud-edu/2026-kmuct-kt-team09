// POST /api/schedule/confirm — 고른 후보를 회의로 확정하고 Google Calendar 이벤트 + Meet 링크 생성.
import { createEvent } from "@/lib/google/calendar";
import { googleConfigured } from "@/lib/google/oauth";
import { fail, ok, readJson } from "@/lib/http";
import { isMockGoogle } from "@/lib/mock";
import { addMeeting, getBundle, updateMeeting } from "@/lib/store";
import type { ConfirmReq, Meeting } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  // 1. body 검증
  const body = await readJson<ConfirmReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId, slot 필요", 400);
  }
  const slot = body.slot;
  if (!slot || typeof slot !== "object") return fail("projectId, slot 필요", 400);
  if (
    typeof slot.id !== "string" ||
    !slot.id ||
    typeof slot.date !== "string" ||
    !slot.date ||
    typeof slot.start !== "string" ||
    !slot.start ||
    typeof slot.end !== "string" ||
    !slot.end
  ) {
    return fail("projectId, slot 필요", 400);
  }

  // 2. bundle 조회
  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);
  if (bundle.project.status === "closed") {
    return fail("종료된 프로젝트", 409);
  }

  // 3. 같은 slot.id 회의가 이미 있으면 반환
  const existing = bundle.meetings.find((m) => m.slot.id === slot.id);
  if (existing) {
    const data: { meeting: Meeting } = { meeting: existing };
    return ok(data, 200);
  }

  // 4. 회의 추가
  const meeting = await addMeeting(body.projectId, slot, null);

  // 5. Google Calendar 이벤트 + Meet 링크 생성 (온라인 회의일 때만)
  let meetLink: string | null = null;

  if (bundle.project.meetingType === "online" && !isMockGoogle() && googleConfigured()) {
    const leader = bundle.members.find((m) => m.role === "leader");
    if (leader && leader.calendarConnected) {
      try {
        // ISO 형식으로 변환: YYYY-MM-DDTHH:MM:SS+09:00
        const startISO = `${slot.date}T${slot.start}:00+09:00`;
        const endISO = `${slot.date}T${slot.end}:00+09:00`;

        const summary = `${bundle.project.name} - ${meeting.number}회차 회의`;
        const description = `프로젝트: ${bundle.project.name}\n목표: ${bundle.project.goal}\n\n이 회의는 TeamFlow에서 자동으로 생성되었습니다.`;
        const attendeeEmails = bundle.members.map((m) => m.email);

        const result = await createEvent(
          leader.id,
          summary,
          description,
          startISO,
          endISO,
          attendeeEmails
        );

        meetLink = result.meetLink;
        console.log(`[schedule/confirm] Created event ${result.eventId} with Meet: ${meetLink}`);
      } catch (err) {
        console.error("[schedule/confirm] Failed to create calendar event:", err);
        // 실패해도 회의는 계속 진행 (Meet 링크 없이)
      }
    }
  }

  // 6. meetLink 저장
  if (meetLink) {
    await updateMeeting(meeting.id, { meetLink });
    meeting.meetLink = meetLink;
  }

  const data: { meeting: Meeting } = { meeting };
  return ok(data, 201);
}
