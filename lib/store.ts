// 저장소 계층. SUPABASE_URL·SUPABASE_SERVICE_KEY가 있으면 Supabase, 없으면 프로세스 메모리.
// route는 여기 함수만 부르고 저장 방식은 모른다.
// 서버리스에서는 요청마다 다른 인스턴스로 갈 수 있어 메모리 저장소로는 데이터가 사라진다.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

const TABLE = "project_bundles";
const now = () => new Date().toISOString();

function demoBundle(): ProjectBundle {
  return {
    project: { ...mockProject },
    members: mockMembers.map((m) => ({ ...m })),
    meetings: [],
    report: null,
  };
}

// ---------- Supabase ----------

const globalSb = globalThis as unknown as { __matchumSb?: SupabaseClient | null };

function sb(): SupabaseClient | null {
  if (globalSb.__matchumSb !== undefined) return globalSb.__matchumSb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  globalSb.__matchumSb =
    url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return globalSb.__matchumSb;
}

async function sbGet(client: SupabaseClient, id: string): Promise<ProjectBundle | null> {
  const { data, error } = await client.from(TABLE).select("bundle").eq("id", id).maybeSingle();
  if (error) {
    console.error("[store] select 실패:", error.message);
    return null;
  }
  return (data?.bundle as ProjectBundle | undefined) ?? null;
}

async function sbPut(client: SupabaseClient, bundle: ProjectBundle): Promise<void> {
  const { error } = await client
    .from(TABLE)
    .upsert({ id: bundle.project.id, bundle, updated_at: now() });
  if (error) console.error("[store] upsert 실패:", error.message);
}

async function sbAll(client: SupabaseClient): Promise<ProjectBundle[]> {
  const { data, error } = await client.from(TABLE).select("bundle");
  if (error) {
    console.error("[store] select all 실패:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.bundle as ProjectBundle);
}

/** 데모 프로젝트가 없으면 한 번 넣어 둔다. */
async function ensureDemo(client: SupabaseClient): Promise<void> {
  const found = await sbGet(client, mockProject.id);
  if (!found) await sbPut(client, demoBundle());
}

// ---------- 메모리 (Supabase가 없을 때) ----------

const globalStore = globalThis as unknown as { __teamflowStore?: Map<string, ProjectBundle> };

function mem(): Map<string, ProjectBundle> {
  if (!globalStore.__teamflowStore) {
    const map = new Map<string, ProjectBundle>();
    map.set(mockProject.id, demoBundle());
    globalStore.__teamflowStore = map;
  }
  return globalStore.__teamflowStore;
}

// ---------- 공개 API (시그니처는 그대로) ----------

export async function createProject(
  input: ProjectInput,
  members: { name: string; email: string }[]
): Promise<ProjectBundle> {
  const projectId = uid();
  const project: Project = { ...input, id: projectId, status: "active", createdAt: now() };
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

  const client = sb();
  if (client) await sbPut(client, bundle);
  else mem().set(projectId, bundle);
  return bundle;
}

export async function getBundle(projectId: string): Promise<ProjectBundle | null> {
  const client = sb();
  if (!client) return mem().get(projectId) ?? null;
  const found = await sbGet(client, projectId);
  if (found) return found;
  // 데모 프로젝트는 처음 찾을 때 심는다.
  if (projectId === mockProject.id) {
    const seeded = demoBundle();
    await sbPut(client, seeded);
    return seeded;
  }
  return null;
}

export async function getMemberByToken(
  projectId: string,
  token: string
): Promise<Member | null> {
  const bundle = await getBundle(projectId);
  if (!bundle) return null;
  return bundle.members.find((m) => m.inviteToken === token) ?? null;
}

export async function setCalendarConnected(
  memberId: string,
  connected: boolean
): Promise<void> {
  const client = sb();
  if (!client) {
    for (const bundle of mem().values()) {
      const member = bundle.members.find((m) => m.id === memberId);
      if (member) {
        member.calendarConnected = connected;
        return;
      }
    }
    return;
  }
  for (const bundle of await sbAll(client)) {
    const member = bundle.members.find((m) => m.id === memberId);
    if (member) {
      member.calendarConnected = connected;
      await sbPut(client, bundle);
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
  const bundle = await getBundle(projectId);
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
    meetLink: null,
    reminderSentAt: null,
    createdAt: now(),
  };
  bundle.meetings.push(meeting);

  const client = sb();
  if (client) await sbPut(client, bundle);
  else mem().set(projectId, bundle);
  return meeting;
}

export async function updateMeeting(
  meetingId: string,
  patch: Partial<
    Pick<Meeting, "status" | "agenda" | "rawNotes" | "summary" | "meetLink" | "reminderSentAt">
  >
): Promise<Meeting | null> {
  const client = sb();
  if (!client) {
    for (const bundle of mem().values()) {
      const meeting = bundle.meetings.find((m) => m.id === meetingId);
      if (meeting) {
        Object.assign(meeting, patch);
        return meeting;
      }
    }
    return null;
  }
  for (const bundle of await sbAll(client)) {
    const meeting = bundle.meetings.find((m) => m.id === meetingId);
    if (meeting) {
      Object.assign(meeting, patch);
      await sbPut(client, bundle);
      return meeting;
    }
  }
  return null;
}

/** 보고서를 저장하고 프로젝트를 닫는다. 없는 프로젝트면 아무것도 하지 않는다. */
export async function saveReport(projectId: string, report: FinalReport): Promise<void> {
  const bundle = await getBundle(projectId);
  if (!bundle) return;
  bundle.report = report;
  bundle.project.status = "closed";

  const client = sb();
  if (client) await sbPut(client, bundle);
  else mem().set(projectId, bundle);
}

/** 크론용. 아직 닫히지 않은 프로젝트만. */
export async function listActiveBundles(): Promise<ProjectBundle[]> {
  const client = sb();
  if (!client) return [...mem().values()].filter((b) => b.project.status === "active");
  await ensureDemo(client);
  return (await sbAll(client)).filter((b) => b.project.status === "active");
}
