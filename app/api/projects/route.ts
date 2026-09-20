// POST /api/projects — 프로젝트와 멤버를 만든다. 성공 201, data는 ProjectBundle.
import { fail, ok, readJson } from "@/lib/http";
import { createProject } from "@/lib/store";
import type { CreateProjectReq } from "@/lib/types";

const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<CreateProjectReq>(req);
  if (!body) return fail("invalid json body");

  const { project, members } = body;
  if (!project || typeof project !== "object") return fail("project is required");

  // 얕은 검증: 필수 키의 존재와 타입만 본다.
  for (const key of [
    "name",
    "goal",
    "deadline",
    "availableStart",
    "availableEnd",
    "preferredStart",
    "preferredEnd",
  ] as const) {
    if (!isStr(project[key])) return fail(`project.${key} must be a non-empty string`);
  }
  for (const key of [
    "expectedMeetingCount",
    "minMeetingMinutes",
    "maxMeetingMinutes",
  ] as const) {
    if (!isNum(project[key])) return fail(`project.${key} must be a number`);
  }
  if (!Array.isArray(project.weekdays)) return fail("project.weekdays must be an array");

  if (!Array.isArray(members) || members.length === 0) {
    return fail("members must be a non-empty array");
  }
  for (const [i, m] of members.entries()) {
    if (!m || typeof m !== "object") return fail(`members[${i}] must be an object`);
    if (!isStr(m.name)) return fail(`members[${i}].name must be a non-empty string`);
    if (!isStr(m.email)) return fail(`members[${i}].email must be a non-empty string`);
  }

  const bundle = await createProject(project, members);
  return ok(bundle, 201);
}
