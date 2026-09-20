// 맞춤 시간 추천 알고리즘 — 팀원 4명 시나리오 테스트.
// 목적: best case / dirty case에서 규칙이 실제로 지켜지는지 확인한다.
import { describe, expect, it } from "vitest";
import { recommend, type ScheduleInput } from "./scheduler";
import type { MemberAvailability } from "@/lib/types";

// 가람(m1, 팀장) · 나래(m2) · 다온(m3) · 라온(m4)
const MEMBERS = ["m1", "m2", "m3", "m4"];
const NAMES: Record<string, string> = { m1: "가람", m2: "나래", m3: "다온", m4: "라온" };

/** "2026-09-22 18:00~19:30" 을 busy 구간으로 */
function busy(date: string, start: string, end: string) {
  return { start: `${date}T${start}:00+09:00`, end: `${date}T${end}:00+09:00` };
}

function availability(map: Record<string, { start: string; end: string }[]>): MemberAvailability[] {
  return MEMBERS.map((id) => ({ memberId: id, busy: map[id] ?? [] }));
}

const BASE: Omit<ScheduleInput, "availability"> = {
  now: "2026-09-21T09:00:00+09:00", // 월요일 09:00 (한국)
  deadline: "2026-10-02",
  weekdays: [1, 2, 3, 4, 5], // 월~금
  availableStart: "10:00",
  availableEnd: "21:00",
  preferredStart: "18:00",
  preferredEnd: "21:00",
  minMeetingMinutes: 60,
  maxMeetingMinutes: 90,
  memberIds: MEMBERS,
  excludedSlotIds: [],
  meetingNumber: 1,
};

/** 사람이 읽을 수 있게 한 줄로 */
function line(s: {
  date: string;
  start: string;
  end: string;
  availableMembers: string[];
  unavailableMembers: string[];
  attendanceRate: number;
  isPreferredTime: boolean;
}) {
  const out = s.unavailableMembers.map((m) => NAMES[m]).join("·") || "없음";
  return `${s.date} ${s.start}~${s.end}  ${s.availableMembers.length}/4 ${Math.round(
    s.attendanceRate * 100
  )}%  ${s.isPreferredTime ? "선호" : "일반"}  불참:${out}`;
}

describe("맞춤 시간 추천 — 4인 시나리오", () => {
  it("BEST · 전원 캘린더가 비어 있으면 100%만, 가장 빠른 날 선호 시간부터", () => {
    const r = recommend({ ...BASE, availability: availability({}) });
    console.log("\n[BEST] 전원 한가");
    r.slots.forEach((s) => console.log("   " + line(s)));

    expect(r.slots).toHaveLength(3);
    expect(r.slots.every((s) => s.attendanceRate === 1)).toBe(true);
    // 오늘(월)은 제외하고 내일(화)부터
    expect(r.slots[0].date).toBe("2026-09-22");
    // 선호 시간대(18:00~21:00)가 앞에
    expect(r.slots[0].isPreferredTime).toBe(true);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it("DIRTY · 1회차인데 전원 가능한 날이 하루도 없으면 50% 규칙으로 내려간다", () => {
    // 매일 서로 어긋나게 바쁘다 → 100% 슬롯이 아예 없음
    const days = ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25",
                  "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
    const map: Record<string, { start: string; end: string }[]> = { m1: [], m2: [], m3: [], m4: [] };
    for (const d of days) {
      map.m1.push(busy(d, "10:00", "14:00"));
      map.m2.push(busy(d, "13:00", "17:00"));
      map.m3.push(busy(d, "16:00", "19:30"));
      map.m4.push(busy(d, "19:00", "21:00"));
    }
    const r = recommend({ ...BASE, availability: availability(map) });
    console.log("\n[DIRTY] 매일 서로 어긋나게 바쁨");
    r.slots.forEach((s) => console.log("   " + line(s)));

    expect(r.slots.length).toBeGreaterThan(0);
    // 전원 참석은 없지만 절반 이상은 보장
    expect(r.slots.every((s) => s.attendanceRate < 1)).toBe(true);
    expect(r.slots.every((s) => s.attendanceRate >= 0.5)).toBe(true);
    // 불참자가 실제로 이름으로 잡힌다
    expect(r.slots[0].unavailableMembers.length).toBeGreaterThan(0);
  });

  it("DIRTY · 참석률 50% 미만만 가능하면 후보 0개 + 이유를 돌려준다", () => {
    // 3명이 회의 가능 시간 전체를 막는다 → 어떤 슬롯도 1/4 = 25%
    const all = ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
    const map: Record<string, { start: string; end: string }[]> = { m1: [], m2: [], m3: [], m4: [] };
    for (const d of all) {
      map.m1.push(busy(d, "10:00", "21:00"));
      map.m2.push(busy(d, "10:00", "21:00"));
      map.m3.push(busy(d, "10:00", "21:00"));
    }
    const r = recommend({ ...BASE, availability: availability(map) });
    console.log("\n[DIRTY] 4명 중 3명이 통째로 불가 →", r.reason);

    expect(r.slots).toHaveLength(0);
    expect(r.reason).toBe("참석률 50% 이상인 시간이 없습니다");
  });

  it("DIRTY · 90분이 안 되면 60분으로 줄여서 다시 찾는다", () => {
    // 마감까지 매일 18:00~19:15만 비워 둔다(75분) → 90분은 불가, 60분은 가능
    const days = ["2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25",
                  "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"];
    const map: Record<string, { start: string; end: string }[]> = { m1: [], m2: [], m3: [], m4: [] };
    for (const d of days) {
      for (const id of MEMBERS) {
        map[id].push(busy(d, "10:00", "18:00"));
        map[id].push(busy(d, "19:15", "21:00")); // 18:00~19:15 = 75분만 비어 있다
      }
    }
    const r = recommend({ ...BASE, availability: availability(map) });
    console.log("\n[DIRTY] 90분 창이 없음 → 사용 길이", r.usedMinutes, "분");
    r.slots.forEach((s) => console.log("   " + line(s)));

    expect(r.usedMinutes).toBe(60);
    expect(r.slots.length).toBeGreaterThan(0);
    expect(r.slots[0].start).toBe("18:00");
    expect(r.slots[0].end).toBe("19:00");
  });

  it("2회차부터는 전원 우선 규칙이 풀려 일부 참석도 후보가 된다", () => {
    // 09-22에만 다온이 저녁에 안 되고, 나머지 날은 전원 가능
    const map = {
      m3: [busy("2026-09-22", "10:00", "21:00")], // 다온이 그날 하루 종일 불가
    };
    const first = recommend({ ...BASE, availability: availability(map), meetingNumber: 1 });
    const second = recommend({ ...BASE, availability: availability(map), meetingNumber: 2 });

    console.log("\n[1회차] 전원 우선");
    first.slots.forEach((s) => console.log("   " + line(s)));
    console.log("[2회차] 50% 규칙");
    second.slots.forEach((s) => console.log("   " + line(s)));

    // 1회차: 전원 가능한 후보만 남는다
    expect(first.slots.every((s) => s.attendanceRate === 1)).toBe(true);
    // 2회차: 같은 입력인데 3/4 후보가 앞에 온다(날짜가 더 빠르므로)
    expect(second.slots[0].date).toBe("2026-09-22");
    expect(second.slots[0].attendanceRate).toBeLessThan(1);
    expect(second.slots[0].unavailableMembers).toContain("m3");
  });

  it("다른 옵션 보기 — 앞서 본 3개와 겹치지 않고 remaining이 줄어든다", () => {
    const page1 = recommend({ ...BASE, availability: availability({}) });
    const seen = page1.slots.map((s) => s.id);
    const page2 = recommend({ ...BASE, availability: availability({}), excludedSlotIds: seen });

    console.log("\n[페이징] 1차");
    page1.slots.forEach((s) => console.log("   " + line(s)));
    console.log("[페이징] 2차");
    page2.slots.forEach((s) => console.log("   " + line(s)));

    expect(page2.slots.some((s) => seen.includes(s.id))).toBe(false);
    expect(page2.remaining).toBe(page1.remaining - page2.slots.length);
  });

  it("확정한 날짜는 다음 추천에서 통째로 빠진다", () => {
    const first = recommend({ ...BASE, availability: availability({}) });
    const takenDate = first.slots[0].date;
    const next = recommend({
      ...BASE,
      availability: availability({}),
      meetingNumber: 2,
      excludedDates: [takenDate],
    });

    console.log("\n[확정 제외] 확정한 날:", takenDate);
    next.slots.forEach((s) => console.log("   " + line(s)));

    expect(next.slots.every((s) => s.date !== takenDate)).toBe(true);
  });

  it("같은 입력이면 항상 같은 결과 (결정적)", () => {
    const map = { m2: [busy("2026-09-22", "18:00", "19:00")], m4: [busy("2026-09-23", "10:00", "21:00")] };
    const a = recommend({ ...BASE, availability: availability(map) });
    const b = recommend({ ...BASE, availability: availability(map) });
    expect(a.slots.map((s) => s.id)).toEqual(b.slots.map((s) => s.id));
    expect(a.remaining).toBe(b.remaining);
  });
});
