// 맞춤 공통 계약. 날짜 "YYYY-MM-DD", 시각 "HH:MM"(24시간, Asia/Seoul), 시점 ISO 문자열.
export type ISO = string;
export type YMD = string;
export type HHMM = string;
export interface Project {
  id: string; name: string; goal: string; deadline: YMD;
  expectedMeetingCount: number;
  availableStart: HHMM; availableEnd: HHMM;      // 회의 가능 시간대
  preferredStart: HHMM; preferredEnd: HHMM;      // 선호 시간대
  minMeetingMinutes: number; maxMeetingMinutes: number;
  weekdays: number[];                            // 0=일 … 6=토. 회의 가능한 요일
  status: "active" | "closed"; createdAt: ISO;
}
export interface Member {
  id: string; projectId: string; name: string; email: string;
  role: "leader" | "member"; inviteToken: string; calendarConnected: boolean;
}
export interface BusyInterval { start: ISO; end: ISO }                  // Google freeBusy 그대로. 제목·내용 없음
export interface MemberAvailability { memberId: string; busy: BusyInterval[] }
export interface TimeSlot {
  id: string;                                    // `${date}T${start}-${end}`
  date: YMD; start: HHMM; end: HHMM;
  availableMembers: string[]; unavailableMembers: string[];   // Member id
  totalMembers: number; attendanceRate: number;  // 0~1
  isPreferredTime: boolean;
}
export interface Agenda { title: string; objectives: string[]; agendaItems: string[] }
export interface ActionItem { assignee: string | null; task: string; dueDate: YMD | null }
export interface MeetingSummary { summary: string; decisions: string[]; actionItems: ActionItem[]; blockers: string[]; nextAgenda: string[] }
export interface Meeting {
  id: string; projectId: string; number: number; slot: TimeSlot;
  status: "scheduled" | "done";
  agenda: Agenda | null; rawNotes: string | null; summary: MeetingSummary | null;
  reminderSentAt: ISO | null; createdAt: ISO;
}
export interface ReportSection { title: string; body: string }
export interface FinalReport { projectId: string; sections: ReportSection[]; generatedAt: ISO }
export type EmailKind = "PROJECT_INVITE" | "MEETING_CONFIRMED" | "MEETING_REMINDER" | "MEETING_SUMMARY";
export interface ProjectBundle { project: Project; members: Member[]; meetings: Meeting[]; report: FinalReport | null }
// 모든 API 응답의 봉투
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
// API 요청·응답 (route와 lib/api-client.ts가 같이 쓴다. 각자 다시 선언하지 않는다)
export type ProjectInput = Omit<Project, "id" | "status" | "createdAt">;
export interface CreateProjectReq { project: ProjectInput; members: { name: string; email: string }[] }
export interface AvailabilityRes { availability: MemberAvailability[]; source: "google" | "mock"; notConnected?: string[] }
export interface RecommendReq { projectId: string; excludedSlotIds: string[] }
export interface RecommendRes { slots: TimeSlot[]; remaining: number; reason?: string | null }   // remaining = 이번 3개 말고 더 보여줄 수 있는 후보 수
export interface ConfirmReq { projectId: string; slot: TimeSlot }
export interface MeetingRef { projectId: string; meetingId: string }
export interface SummarizeReq extends MeetingRef { rawNotes: string }
export interface EmailReq { projectId: string; kind: EmailKind; meetingId?: string }
export interface EmailRes { sent: number; via: "gmail" | "mock"; error?: string }
// 역할 제안 (사람에게 배정하지 않고 나눠만 둔다)
export interface RoleSuggestion { title: string; scope: string; firstTask: string }
export interface RolesReq { projectId: string }
export interface RolesRes { roles: RoleSuggestion[] }
