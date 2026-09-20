// POST /api/report/generate — 최종 보고서를 만들어 저장한다(프로젝트가 closed로 바뀐다).
import { fail, ok, readJson } from "@/lib/http";
import { generateFinalReport } from "@/lib/claude/report";
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

  const doneMeetings = bundle.meetings
    .filter((m) => m.status === "done" && m.summary !== null)
    .sort((a, b) => a.number - b.number);

  if (doneMeetings.length === 0) {
    return fail("요약된 회의가 없습니다", 409);
  }

  const report = await generateFinalReport({
    projectId: body.projectId,
    projectName: bundle.project.name,
    projectGoal: bundle.project.goal,
    deadline: bundle.project.deadline,
    meetings: doneMeetings,
  });

  await saveReport(body.projectId, report);
  const data: { report: FinalReport } = { report };
  return ok(data);
}
