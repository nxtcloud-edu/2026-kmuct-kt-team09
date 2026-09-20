// POST /api/schedule/recommend — 회의 시간 후보를 돌려준다.
// 지금은 mockSlots 고정. B가 lib/scheduler.ts 결과로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok, readJson } from "@/lib/http";
import { mockSlots } from "@/lib/mock";
import { getBundle } from "@/lib/store";
import type { RecommendReq, RecommendRes } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<RecommendReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);

  // 누락되면 제외 없음으로 본다.
  const excluded = Array.isArray(body.excludedSlotIds) ? body.excludedSlotIds : [];
  const slots = mockSlots.filter((s) => !excluded.includes(s.id));

  // mock 단계에서는 더 보여줄 후보가 없다.
  const data: RecommendRes = { slots, remaining: 0 };
  return ok(data);
}
