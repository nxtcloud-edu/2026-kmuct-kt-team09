import type {
  ApiResult,
  AvailabilityRes,
  ConfirmReq,
  CreateProjectReq,
  EmailReq,
  EmailRes,
  FinalReport,
  Meeting,
  MeetingRef,
  MeetingSummary,
  ProjectBundle,
  RecommendReq,
  RecommendRes,
  SummarizeReq,
  Agenda,
} from "@/lib/types";

async function call<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
      },
      cache: "no-store",
    });
    const json = await res.json();
    return json as ApiResult<T>;
  } catch {
    return { ok: false, error: "네트워크 오류" };
  }
}

export const api = {
  createProject(body: CreateProjectReq) {
    return call<ProjectBundle>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getProject(id: string) {
    return call<ProjectBundle>(`/api/projects/${id}`, {
      method: "GET",
    });
  },

  availability(projectId: string) {
    return call<AvailabilityRes>(
      `/api/calendar/availability?projectId=${projectId}`,
      {
        method: "GET",
      }
    );
  },

  recommend(body: RecommendReq) {
    return call<RecommendRes>("/api/schedule/recommend", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  confirm(body: ConfirmReq) {
    return call<{ meeting: Meeting }>("/api/schedule/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  agenda(body: MeetingRef) {
    return call<{ agenda: Agenda }>("/api/meeting/agenda", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  summarize(body: SummarizeReq) {
    return call<{ summary: MeetingSummary }>("/api/meeting/summarize", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  sendEmail(body: EmailReq) {
    return call<EmailRes>("/api/email/send", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  generateReport(projectId: string) {
    return call<{ report: FinalReport }>("/api/report/generate", {
      method: "POST",
      body: JSON.stringify({ projectId }),
    });
  },
};
