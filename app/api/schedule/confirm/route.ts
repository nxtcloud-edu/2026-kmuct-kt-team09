// POST /api/schedule/confirm — 고른 후보를 회의로 확정한다. 성공 201.
import { fail, ok, readJson } from "@/lib/http";
import { addMeeting, getBundle } from "@/lib/store";
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
  const data: { meeting: Meeting } = { meeting };
  return ok(data, 201);
}
