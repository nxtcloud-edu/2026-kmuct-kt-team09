// POST /api/schedule/confirm — 고른 후보를 회의로 확정한다. 성공 201.
import { fail, ok, readJson } from "@/lib/http";
import { addMeeting, getBundle } from "@/lib/store";
import type { ConfirmReq, Meeting } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<ConfirmReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }
  const slot = body.slot;
  if (!slot || typeof slot !== "object") return fail("slot is required");
  if (typeof slot.id !== "string" || !slot.id) {
    return fail("slot.id must be a non-empty string");
  }

  // addMeeting은 프로젝트가 없으면 throw하므로 여기서 먼저 404를 낸다.
  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);

  const meeting = await addMeeting(body.projectId, slot, null);
  const data: { meeting: Meeting } = { meeting };
  return ok(data, 201);
}
