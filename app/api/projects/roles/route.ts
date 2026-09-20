// POST /api/projects/roles — 목표와 팀원 수에 맞춰 역할을 나눈다(사람에게 배정하지 않는다).
import { fail, ok, readJson } from "@/lib/http";
import { getBundle } from "@/lib/store";
import { suggestRoles } from "@/lib/claude/roles";
import type { RolesReq, RolesRes } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<RolesReq>(req);
  if (!body) return fail("invalid json body");
  if (typeof body.projectId !== "string" || !body.projectId) {
    return fail("projectId must be a non-empty string");
  }

  const bundle = await getBundle(body.projectId);
  if (!bundle) return fail("not found", 404);

  const { roles } = await suggestRoles({
    projectName: bundle.project.name,
    projectGoal: bundle.project.goal,
    deadline: bundle.project.deadline,
    memberCount: bundle.members.length,
    expectedMeetingCount: bundle.project.expectedMeetingCount,
  });

  const data: RolesRes = { roles };
  return ok(data);
}
