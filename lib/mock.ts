// 데모·개발용 고정 데이터. 외부 API(Google·Claude) 없이 전 흐름이 돌아야 한다.
// 모든 시각은 Asia/Seoul(+09:00) 기준이고, 값은 절대 랜덤하지 않다.
import type {
  Agenda,
  BusyInterval,
  FinalReport,
  HHMM,
  MeetingSummary,
  Member,
  MemberAvailability,
  Project,
  TimeSlot,
  YMD,
} from "@/lib/types";

/** 데모에서 "지금"으로 취급하는 시점. new Date()를 쓰지 말고 이 값을 기준으로 계산한다. */
export const MOCK_NOW = "2026-09-21T09:00:00+09:00";

export const mockProject: Project = {
  id: "demo",
  name: "캠퍼스 분실물 찾기 앱",
  goal: "소프트웨어공학 팀 프로젝트: 분실물 찾기 앱의 요구사항 명세서·화면 설계·중간 발표 슬라이드를 만든다.",
  deadline: "2026-10-07",
  expectedMeetingCount: 4,
  availableStart: "10:00",
  availableEnd: "21:00",
  preferredStart: "18:00",
  preferredEnd: "21:00",
  minMeetingMinutes: 60,
  maxMeetingMinutes: 90,
  weekdays: [1, 2, 3, 4, 5],
  meetingType: "online",
  status: "active",
  createdAt: MOCK_NOW,
};

export const mockMembers: Member[] = [
  {
    id: "m1",
    projectId: "demo",
    name: "김가람",
    email: "m1@example.invalid",
    role: "leader",
    inviteToken: "tok-m1",
    calendarConnected: true,
  },
  {
    id: "m2",
    projectId: "demo",
    name: "이나래",
    email: "m2@example.invalid",
    role: "member",
    inviteToken: "tok-m2",
    calendarConnected: true,
  },
  {
    id: "m3",
    projectId: "demo",
    name: "박다온",
    email: "m3@example.invalid",
    role: "member",
    inviteToken: "tok-m3",
    calendarConnected: true,
  },
  {
    id: "m4",
    projectId: "demo",
    name: "최라온",
    email: "m4@example.invalid",
    role: "member",
    inviteToken: "tok-m4",
    calendarConnected: true,
  },
];

/** Google freeBusy가 돌려주는 모양 그대로 만든다. 제목·내용은 없다. */
const busy = (date: YMD, start: HHMM, end: HHMM): BusyInterval => ({
  start: `${date}T${start}:00+09:00`,
  end: `${date}T${end}:00+09:00`,
});

/** 2026-09-22(화) ~ 2026-09-25(금) 4일치 바쁜 구간. */
export const mockAvailability: MemberAvailability[] = [
  {
    memberId: "m1",
    busy: [
      busy("2026-09-22", "10:00", "12:00"),
      busy("2026-09-22", "16:00", "21:00"),
      busy("2026-09-23", "10:00", "12:00"),
      busy("2026-09-24", "10:00", "12:00"),
      busy("2026-09-25", "10:00", "12:00"),
    ],
  },
  {
    memberId: "m2",
    busy: [
      busy("2026-09-22", "12:00", "13:30"),
      busy("2026-09-23", "11:30", "13:00"),
      busy("2026-09-24", "12:00", "15:00"),
      busy("2026-09-24", "18:00", "19:30"),
    ],
  },
  {
    memberId: "m3",
    busy: [
      busy("2026-09-22", "13:00", "14:30"),
      busy("2026-09-22", "17:20", "21:00"),
      busy("2026-09-23", "14:30", "16:00"),
      busy("2026-09-24", "15:00", "16:30"),
      busy("2026-09-24", "20:00", "21:00"),
      busy("2026-09-25", "15:00", "21:00"),
    ],
  },
  {
    memberId: "m4",
    busy: [
      busy("2026-09-22", "14:30", "16:00"),
      busy("2026-09-23", "13:30", "21:00"),
      busy("2026-09-24", "16:30", "18:30"),
      busy("2026-09-25", "13:00", "15:00"),
    ],
  },
];

/** B2(실제 스케줄러) 전까지 /api/schedule/recommend가 돌려줄 고정 후보 3개. */
export const mockSlots: TimeSlot[] = [
  {
    id: "2026-09-25T18:00-19:00",
    date: "2026-09-25",
    start: "18:00",
    end: "19:00",
    availableMembers: ["m1", "m2", "m4"],
    unavailableMembers: ["m3"],
    totalMembers: 4,
    attendanceRate: 0.75,
    isPreferredTime: true,
  },
  {
    id: "2026-09-24T19:30-20:30",
    date: "2026-09-24",
    start: "19:30",
    end: "20:30",
    availableMembers: ["m1", "m2", "m4"],
    unavailableMembers: ["m3"],
    totalMembers: 4,
    attendanceRate: 0.75,
    isPreferredTime: true,
  },
  {
    id: "2026-09-23T10:00-11:00",
    date: "2026-09-23",
    start: "10:00",
    end: "11:00",
    availableMembers: ["m2", "m3", "m4"],
    unavailableMembers: ["m1"],
    totalMembers: 4,
    attendanceRate: 0.75,
    isPreferredTime: false,
  },
];

export const mockAgenda: Agenda = {
  title: "1차 회의: 기능 범위 확정과 역할 분담",
  objectives: [
    "분실물 찾기 앱에서 중간 발표까지 구현할 핵심 기능을 3개로 좁힌다.",
    "요구사항 명세서의 목차와 작성 담당자를 확정한다.",
    "중간 발표 전까지의 주차별 마감일을 합의한다.",
  ],
  agendaItems: [
    "프로젝트 목표와 교수님 평가 기준 공유 (10분)",
    "기존 분실물 게시판·오픈채팅 방식의 문제점 정리 (15분)",
    "핵심 기능 우선순위 투표: 분실물 등록, 사진 기반 검색, 습득물 매칭 알림 (20분)",
    "요구사항 명세서 목차 초안 검토와 담당자 배정 (15분)",
    "다음 회의 전까지의 과제와 마감일 확정 (10분)",
  ],
};

export const mockSummary: MeetingSummary = {
  summary:
    "중간 발표까지 구현할 핵심 기능을 분실물 등록, 사진 기반 검색, 습득물 매칭 알림 3개로 확정했다. 요구사항 명세서는 IEEE 830 형식을 따르되 분량을 15쪽 내외로 줄이기로 했고, 화면 설계는 Figma로 작업해 발표 슬라이드에 그대로 넣기로 했다. 캠퍼스 내 위치 표시는 범위가 커서 이번 학기 구현 대상에서 제외했다.",
  decisions: [
    "핵심 기능은 분실물 등록·사진 기반 검색·습득물 매칭 알림 3개로 고정한다.",
    "요구사항 명세서는 IEEE 830 형식, 15쪽 내외로 작성한다.",
    "화면 설계는 Figma로 하고 발표 슬라이드에 캡처를 재사용한다.",
    "지도 기반 위치 표시 기능은 이번 학기 범위에서 제외한다.",
  ],
  actionItems: [
    { assignee: "김가람", task: "요구사항 명세서 1~3장(개요·전체 설명) 초안 작성", dueDate: "2026-09-27" },
    { assignee: "이나래", task: "기능 요구사항 표와 유스케이스 다이어그램 작성", dueDate: "2026-09-27" },
    { assignee: "박다온", task: "Figma로 등록·검색·알림 화면 와이어프레임 3종 제작", dueDate: "2026-09-29" },
    { assignee: "최라온", task: "경쟁 서비스 3개 비교표와 중간 발표 슬라이드 목차 작성", dueDate: "2026-09-29" },
  ],
  blockers: [
    "사진 기반 검색의 유사도 판정 방식을 아직 정하지 못했다. 외부 API를 쓸지 태그 기반으로 갈지 2차 회의에서 결정해야 한다.",
    "학교 학사 시스템 로그인 연동 가능 여부를 확인할 창구가 없다.",
  ],
  nextAgenda: [
    "사진 기반 검색 방식 결정: 외부 이미지 API vs 태그 기반 필터",
    "요구사항 명세서 1~3장 초안 상호 검토",
    "와이어프레임 3종 리뷰와 화면 흐름 확정",
    "중간 발표 슬라이드 역할 분담",
  ],
};

/** 최종 보고서. 8개 절 제목은 고정이다. */
export const mockReport = (projectId: string): FinalReport => ({
  projectId,
  generatedAt: MOCK_NOW,
  sections: [
    {
      title: "프로젝트 개요",
      body: "본 프로젝트는 소프트웨어공학 수업의 팀 프로젝트로, 캠퍼스 안에서 발생하는 분실물 문제를 해결하는 모바일 웹 앱을 기획하고 설계했다. 4명이 한 팀을 이뤄 요구사항 명세서, 화면 설계, 중간 발표 자료를 산출물로 삼았다. 기간은 2026년 9월 21일부터 10월 7일까지 약 2주였다.",
    },
    {
      title: "프로젝트 목표",
      body: "학과 건물별로 흩어져 있는 분실물 정보를 한 곳에 모아, 잃어버린 사람과 주운 사람이 서로를 빨리 찾게 하는 것이 목표였다. 구체적으로는 분실물 등록, 사진 기반 검색, 습득물 매칭 알림 3개 기능을 중간 발표 범위로 확정했다. 지도 기반 위치 표시는 학기 내 구현이 어렵다고 판단해 범위에서 제외했다.",
    },
    {
      title: "주차별 활동",
      body: "1주차에는 기능 범위를 확정하고 요구사항 명세서 목차와 담당자를 배정했다. 2주차에는 유스케이스 다이어그램과 Figma 와이어프레임 3종을 만들고 서로 교차 검토했다. 3주차에는 명세서를 15쪽으로 정리하고 중간 발표 슬라이드를 완성했다.",
    },
    {
      title: "주요 의사결정",
      body: "요구사항 명세서는 IEEE 830 형식을 따르되 분량을 15쪽 내외로 줄여 실질적인 내용에 집중하기로 했다. 사진 기반 검색은 외부 이미지 API 대신 카테고리·색상 태그 필터 방식으로 결정해 구현 위험을 낮췄다. 화면 설계는 Figma로 통일해 발표 슬라이드에 캡처를 그대로 재사용했다.",
    },
    {
      title: "역할 및 Action Item",
      body: "김가람(팀장)은 일정 관리와 명세서 1~3장을, 이나래는 기능 요구사항 표와 유스케이스 다이어그램을 맡았다. 박다온은 Figma 와이어프레임 3종을, 최라온은 경쟁 서비스 비교와 발표 슬라이드를 담당했다. 각 Action Item은 회의마다 담당자와 마감일을 붙여 기록하고 다음 회의 시작 때 이행 여부를 확인했다.",
    },
    {
      title: "문제 및 해결 과정",
      body: "사진 기반 검색의 유사도 판정 방식을 두고 1차 회의에서 결론이 나지 않아 2차 회의로 넘겼고, 구현 난이도를 비교한 뒤 태그 기반으로 합의했다. 학사 시스템 로그인 연동은 확인 창구가 없어 이메일 인증으로 대체했다. 팀원 4명의 공강 시간이 겹치지 않아 회의 일정 조정에 시간을 많이 썼고, 이후에는 선호 시간대를 평일 저녁으로 고정해 해결했다.",
    },
    {
      title: "주요 성과",
      body: "4회 회의를 모두 진행하며 결정 사항과 Action Item을 빠짐없이 문서로 남겼다. 15쪽 분량의 요구사항 명세서와 화면 3종 와이어프레임, 중간 발표 슬라이드를 마감 전에 완성했다. 기능 범위를 1주차에 확정한 덕에 이후 작업에서 방향이 흔들리지 않았다.",
    },
    {
      title: "최종 결과",
      body: "중간 발표에서 분실물 등록·검색·알림 흐름을 실제 화면 설계와 함께 시연 수준으로 전달했다. 산출물 3종을 기한 내 제출했고, 태그 기반 검색으로 범위를 좁힌 판단이 현실적이라는 평가를 받았다. 남은 기간에는 습득물 매칭 알림의 예외 처리와 관리자 화면을 보완할 계획이다.",
    },
  ],
});

export const isMockGoogle = () => process.env.MOCK_GOOGLE === "true";
export const isMockClaude = () => process.env.MOCK_CLAUDE === "true";
