// POST /api/report/generate — 최종 보고서를 만들어 저장한다(프로젝트가 closed로 바뀐다).
// 지금은 mockReport 고정. D1이 Claude 호출로 본문만 갈아낀다(응답 모양은 그대로).
import { fail, ok, readJson } from "@/lib/http";
import { mockReport } from "@/lib/mock";
import { getBundle, saveReport } from "@/lib/store";
import type { FinalReport } from "@/lib/types";

// lib/types.ts에 이 요청 전용 타입이 없다(동결 파일이라 추가하지 않음).
type GenerateReportReq = { projectId: string };

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<GenerateReportReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);

  const report = mockReport(body.projectId);
  await saveReport(body.projectId, report);
  const data: { report: FinalReport } = { report };
  return ok(data);
}
