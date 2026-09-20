import { describe, it, expect } from "vitest";
import type { MemberAvailability } from "@/lib/types";
import { recommend, type ScheduleInput } from "./scheduler";
import { kstParts, weekdayOf, busyRangesOn } from "./time";

const base: ScheduleInput = {
  now: "2026-09-21T09:00:00+09:00",
  deadline: "2026-09-25",
  weekdays: [1, 2, 3, 4, 5],
  availableStart: "18:00",
  availableEnd: "21:00",
  preferredStart: "19:00",
  preferredEnd: "21:00",
  minMeetingMinutes: 60,
  maxMeetingMinutes: 60,
  memberIds: ["a", "b", "c", "d"],
  availability: [],
  excludedSlotIds: [],
  meetingNumber: 2,
};

function busy(id: string, date: string, from: string, to: string): MemberAvailability {
  return {
    memberId: id,
    busy: [{ start: `${date}T${from}:00+09:00`, end: `${date}T${to}:00+09:00` }],
  };
}

describe("scheduler", () => {
  it("전원 참석 가능", () => {
    const result = recommend(base);
    expect(result.slots.map((s) => s.id)).toEqual([
      "2026-09-22T19:00-20:00",
      "2026-09-22T20:00-21:00",
      "2026-09-22T18:00-19:00",
    ]);
    expect(result.slots.every((s) => s.attendanceRate === 1)).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("일부 참석 가능", () => {
    const input: ScheduleInput = {
      ...base,
      availability: [busy("d", "2026-09-22", "18:00", "21:00")],
    };
    const result = recommend(input);
    expect(result.slots[0].id).toBe("2026-09-22T19:00-20:00");
    expect(result.slots[0].attendanceRate).toBe(0.75);
    expect(result.slots[0].unavailableMembers).toEqual(["d"]);

    // meetingNumber 1이면 전원 우선
    const input2: ScheduleInput = { ...input, meetingNumber: 1 };
    const result2 = recommend(input2);
    expect(result2.slots[0].id).toBe("2026-09-23T19:00-20:00");
  });

  it("참석률 50%", () => {
    const input: ScheduleInput = {
      ...base,
      availability: [busy("c", "2026-09-22", "18:00", "21:00"), busy("d", "2026-09-22", "18:00", "21:00")],
    };
    const result = recommend(input);
    expect(result.slots[0].date).toBe("2026-09-22");
    expect(result.slots[0].attendanceRate).toBe(0.5);
  });

  it("참석률 50% 미만", () => {
    const input: ScheduleInput = {
      ...base,
      availability: [
        busy("b", "2026-09-22", "18:00", "21:00"),
        busy("c", "2026-09-22", "18:00", "21:00"),
        busy("d", "2026-09-22", "18:00", "21:00"),
      ],
    };
    const result = recommend(input);
    expect(result.slots.every((s) => s.date !== "2026-09-22")).toBe(true);
    expect(result.slots[0].id).toBe("2026-09-23T19:00-20:00");
  });

  it("선호 시간 충돌", () => {
    const input: ScheduleInput = {
      ...base,
      availability: [
        busy("a", "2026-09-22", "19:00", "21:00"),
        busy("b", "2026-09-22", "19:00", "21:00"),
        busy("c", "2026-09-22", "19:00", "21:00"),
        busy("d", "2026-09-22", "19:00", "21:00"),
      ],
    };
    const result = recommend(input);
    expect(result.slots[0].id).toBe("2026-09-22T18:00-19:00");
    expect(result.slots[0].isPreferredTime).toBe(false);
  });

  it("excluded slot 존재", () => {
    const input: ScheduleInput = {
      ...base,
      excludedSlotIds: ["2026-09-22T19:00-20:00", "2026-09-22T20:00-21:00", "2026-09-22T18:00-19:00"],
    };
    const result = recommend(input);
    expect(result.slots.map((s) => s.id)).toEqual([
      "2026-09-23T19:00-20:00",
      "2026-09-23T20:00-21:00",
      "2026-09-23T18:00-19:00",
    ]);
    expect(result.remaining).toBe(6);
  });

  it("가능한 시간이 3개 미만", () => {
    const input: ScheduleInput = {
      ...base,
      deadline: "2026-09-22",
      availability: [
        busy("a", "2026-09-22", "18:00", "20:00"),
        busy("b", "2026-09-22", "18:00", "20:00"),
        busy("c", "2026-09-22", "18:00", "20:00"),
        busy("d", "2026-09-22", "18:00", "20:00"),
      ],
    };
    const result = recommend(input);
    expect(result.slots.length).toBe(1);
    expect(result.slots[0].id).toBe("2026-09-22T20:00-21:00");
    expect(result.remaining).toBe(0);

    // 모두 busy면 슬롯 없음
    const input2: ScheduleInput = {
      ...base,
      deadline: "2026-09-22",
      availability: [
        busy("a", "2026-09-22", "18:00", "21:00"),
        busy("b", "2026-09-22", "18:00", "21:00"),
        busy("c", "2026-09-22", "18:00", "21:00"),
        busy("d", "2026-09-22", "18:00", "21:00"),
      ],
    };
    const result2 = recommend(input2);
    expect(result2.slots.length).toBe(0);
    expect(result2.reason).toBe("참석률 50% 이상인 시간이 없습니다");
  });

  it("UTC 서버에서도 한국 날짜", () => {
    const parts = kstParts("2026-09-21T16:30:00Z");
    expect(parts.ymd).toBe("2026-09-22");
    expect(parts.minutes).toBe(90);

    expect(weekdayOf("2026-09-24")).toBe(4);

    const ranges = busyRangesOn(
      [{ start: "2026-09-22T21:00:00+09:00", end: "2026-09-23T06:30:00+09:00" }],
      "2026-09-23"
    );
    expect(ranges).toEqual([[0, 390]]);
  });

  it("최대 길이로 없으면 최소 길이", () => {
    const input: ScheduleInput = {
      ...base,
      maxMeetingMinutes: 90,
      availableStart: "20:00",
    };
    const result = recommend(input);
    expect(result.usedMinutes).toBe(60);
    expect(result.slots[0].id).toBe("2026-09-22T20:00-21:00");
  });

  it("이미 회의가 있는 날짜 제외", () => {
    const input: ScheduleInput = {
      ...base,
      excludedDates: ["2026-09-22"],
    };
    const result = recommend(input);
    expect(result.slots[0].id).toBe("2026-09-23T19:00-20:00");
    expect(result.remaining).toBe(6);
  });
});
