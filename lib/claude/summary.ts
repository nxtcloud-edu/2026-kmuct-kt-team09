// Server-only. Do not import from client components.
import { askJson, str, strArr } from "./client";
import type { ActionItem, MeetingSummary } from "@/lib/types";

const MAX_NOTES = 30000;
const DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fallbackSummary(rawMeetingNotes: string): MeetingSummary {
  const trimmed = rawMeetingNotes.slice(0, 200);
  const summary = trimmed + (rawMeetingNotes.length > 200 ? "…" : "");
  return {
    summary,
    decisions: [],
    actionItems: [],
    blockers: [],
    nextAgenda: ["지난 회의 내용 확인"],
  };
}

function validateActionItem(v: unknown, memberNames: string[]): ActionItem | null {
  if (typeof v !== "object" || v === null) return null;
  const obj = v as Record<string, unknown>;
  const task = str(obj.task, 200);
  if (!task) return null;

  const assigneeRaw = typeof obj.assignee === "string" ? obj.assignee : null;
  const assignee = assigneeRaw && memberNames.includes(assigneeRaw) ? assigneeRaw : null;

  const dueDateRaw = typeof obj.dueDate === "string" ? obj.dueDate : null;
  const dueDate = dueDateRaw && DUE_DATE_RE.test(dueDateRaw) ? dueDateRaw : null;

  return { assignee, task, dueDate };
}

function validate(v: unknown, memberNames: string[]): MeetingSummary | null {
  if (typeof v !== "object" || v === null) return null;
  const obj = v as Record<string, unknown>;

  if (
    typeof obj.summary !== "string" ||
    !Array.isArray(obj.decisions) ||
    !Array.isArray(obj.actionItems) ||
    !Array.isArray(obj.blockers) ||
    !Array.isArray(obj.nextAgenda)
  ) {
    return null;
  }

  const summary = str(obj.summary, 2000);
  const decisions = strArr(obj.decisions, 10, 200);
  const blockers = strArr(obj.blockers, 10, 200);
  const nextAgenda = strArr(obj.nextAgenda, 4, 80);
  const actionItems = obj.actionItems
    .map((item) => validateActionItem(item, memberNames))
    .filter((item): item is ActionItem => item !== null)
    .slice(0, 10);

  return { summary, decisions, actionItems, blockers, nextAgenda };
}

export async function summarizeMeeting(input: {
  projectGoal: string;
  rawMeetingNotes: string;
  memberNames: string[];
}): Promise<MeetingSummary> {
  const rawMeetingNotes = input.rawMeetingNotes.slice(0, MAX_NOTES);

  const system =
    "너는 회의록을 정리하는 서기다. 회의록에 없는 결정·담당·기한을 만들지 않는다. 참석하지 못한 팀원이 읽고 따라올 수 있게 쓴다.";

  const user = `프로젝트 목표: ${input.projectGoal}
팀원 이름 목록: ${input.memberNames.join(", ")}

회의록 원문:
"""
${rawMeetingNotes}
"""

다음 JSON 형식으로만 출력한다:
{
  "summary": "3~5문장으로 회의 전체 내용을 요약",
  "decisions": ["회의록에서 확정된 결정만 나열"],
  "actionItems": [
    { "assignee": "팀원 이름 목록 중 하나 또는 null(불명확하면 null)", "task": "할 일", "dueDate": "YYYY-MM-DD 또는 null" }
  ],
  "blockers": ["막혀서 해결되지 않은 것들"],
  "nextAgenda": ["다음 회의에서 다룰 것 2~4개"]
}
회의록에 없는 내용은 절대 지어내지 않는다.`;

  const memberNames = input.memberNames;
  const { data } = await askJson<MeetingSummary>({
    system,
    user,
    maxTokens: 3000,
    validate: (v) => validate(v, memberNames),
    fallback: fallbackSummary(rawMeetingNotes),
  });

  return data;
}
