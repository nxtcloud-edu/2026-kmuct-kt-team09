// 저장소 계층. 지금은 프로세스 메모리, D2에서 Supabase로 갈아낀다.
// route는 여기 함수만 부르고 Map을 직접 만지지 않는다.
// 멤버 id·회의 id는 저장소 전체에서 유일하므로 id만으로 찾을 때는 모든 bundle을 훑는다.
import { uid } from "@/lib/http";
import { mockMembers, mockProject } from "@/lib/mock";
import type {
  Agenda,
  FinalReport,
  Meeting,
  Member,
  Project,
  ProjectBundle,
  TimeSlot,
} from "@/lib/types";

type ProjectInput = Omit<Project, "id" | "status" | "createdAt">;

// dev 핫리로드에서 모듈이 다시 평가돼도 데이터가 날아가지 않게 globalThis에 붙인다.
const globalStore = globalThis as unknown as {
  __teamflowStore?: Map<string, ProjectBundle>;
};

function db(): Map<string, ProjectBundle> {
  if (!globalStore.__teamflowStore) {
    const map = new Map<string, ProjectBundle>();
    // 첫 접근 때 데모 프로젝트를 시드한다. 회의·보고서는 비어 있는 상태로 시작.
    map.set(mockProject.id, {
      project: { ...mockProject },
      members: mockMembers.map((m) => ({ ...m })),
      meetings: [],
      report: null,
    });
    globalStore.__teamflowStore = map;
  }
  return globalStore.__teamflowStore;
}

const now = () => new Date().toISOString();

export async function createProject(
  input: ProjectInput,
  members: { name: string; email: string }[]
): Promise<ProjectBundle> {
  const projectId = uid();
  const project: Project = {
    ...input,
    id: projectId,
    status: "active",
    createdAt: now(),
  };
  const bundle: ProjectBundle = {
    project,
    // 첫 번째 멤버가 팀장이다.
    members: members.map((m, i) => ({
      id: uid(),
      projectId,
      name: m.name,
      email: m.email,
      role: i === 0 ? "leader" : "member",
      inviteToken: uid(16),
      calendarConnected: false,
    })),
    meetings: [],
    report: null,
  };
  db().set(projectId, bundle);
  return bundle;
}

export async function getBundle(projectId: string): Promise<ProjectBundle | null> {
  return db().get(projectId) ?? null;
}

export async function getMemberByToken(
  projectId: string,
  token: string
): Promise<Member | null> {
  const bundle = db().get(projectId);
  if (!bundle) return null;
  return bundle.members.find((m) => m.inviteToken === token) ?? null;
}

export async function setCalendarConnected(
  memberId: string,
  connected: boolean
): Promise<void> {
  for (const bundle of db().values()) {
    const member = bundle.members.find((m) => m.id === memberId);
    if (member) {
      member.calendarConnected = connected;
      return;
    }
  }
}

/** 프로젝트가 없으면 throw. 호출하는 route가 먼저 getBundle로 404를 처리한다. */
export async function addMeeting(
  projectId: string,
  slot: TimeSlot,
  agenda: Agenda | null
): Promise<Meeting> {
  const bundle = db().get(projectId);
  if (!bundle) throw new Error(`project not found: ${projectId}`);
  const meeting: Meeting = {
    id: uid(),
    projectId,
    number: bundle.meetings.length + 1,
    slot,
    status: "scheduled",
    agenda,
    rawNotes: null,
    summary: null,
    reminderSentAt: null,
    createdAt: now(),
  };
  bundle.meetings.push(meeting);
  return meeting;
}

export async function updateMeeting(
  meetingId: string,
  patch: Partial<
    Pick<Meeting, "status" | "agenda" | "rawNotes" | "summary" | "reminderSentAt">
  >
): Promise<Meeting | null> {
  for (const bundle of db().values()) {
    const meeting = bundle.meetings.find((m) => m.id === meetingId);
    if (meeting) {
      Object.assign(meeting, patch);
      return meeting;
    }
  }
  return null;
}

/** 보고서를 저장하고 프로젝트를 닫는다. 없는 프로젝트면 아무것도 하지 않는다. */
export async function saveReport(projectId: string, report: FinalReport): Promise<void> {
  const bundle = db().get(projectId);
  if (!bundle) return;
  bundle.report = report;
  bundle.project.status = "closed";
}

/** 크론용. 아직 닫히지 않은 프로젝트만. */
export async function listActiveBundles(): Promise<ProjectBundle[]> {
  return [...db().values()].filter((b) => b.project.status === "active");
}
