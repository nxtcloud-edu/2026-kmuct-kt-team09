import type { TimeSlot, MemberAvailability, YMD, HHMM, ISO } from "@/lib/types";
import { toMin, toHHMM, kstParts, addDays, weekdayOf, compareYmd, busyRangesOn } from "./time";

export interface ScheduleInput {
  now: ISO;
  deadline: YMD;
  weekdays: number[];
  availableStart: HHMM;
  availableEnd: HHMM;
  preferredStart: HHMM;
  preferredEnd: HHMM;
  minMeetingMinutes: number;
  maxMeetingMinutes: number;
  memberIds: string[];
  availability: MemberAvailability[];
  excludedSlotIds: string[];
  meetingNumber: number;
  excludedDates?: YMD[];
  horizonDays?: number;
  slotMinutes?: number;
}

export interface ScheduleResult {
  slots: TimeSlot[];
  remaining: number;
  usedMinutes: number;
  reason: string | null;
}

export const EARLIEST = "06:00";
export const LATEST = "22:00";
export const MIN_ATTENDANCE = 0.5;

/** 모든 가능한 슬롯 생성·정렬·겹침 제거 (excludedSlotIds 고려 X) */
export function rankAll(input: ScheduleInput, lengthMinutes: number): TimeSlot[] {
  const {
    now,
    deadline,
    weekdays,
    availableStart,
    availableEnd,
    preferredStart,
    preferredEnd,
    memberIds,
    availability,
    meetingNumber,
    excludedDates = [],
    horizonDays = 14,
    slotMinutes = 30,
  } = input;

  if (memberIds.length === 0) return [];

  // 1. 회의 가능 창
  const ws = Math.max(toMin(availableStart), toMin(EARLIEST));
  const we = Math.min(toMin(availableEnd), toMin(LATEST));
  if (we - ws < lengthMinutes) return [];

  // 멤버별 busy 맵 구축
  const busyMap = new Map<string, MemberAvailability>();
  for (const ma of availability) {
    const existing = busyMap.get(ma.memberId);
    if (existing) {
      existing.busy.push(...ma.busy);
    } else {
      busyMap.set(ma.memberId, { memberId: ma.memberId, busy: [...ma.busy] });
    }
  }

  const allSlots: TimeSlot[] = [];
  const today = kstParts(now).ymd;
  const last = compareYmd(deadline, addDays(today, horizonDays)) < 0 ? deadline : addDays(today, horizonDays);

  // 2. 날짜 순회
  let d = addDays(today, 1);
  while (compareYmd(d, last) <= 0) {
    const wd = weekdayOf(d);
    if (!weekdays.includes(wd) || excludedDates.includes(d)) {
      d = addDays(d, 1);
      continue;
    }

    // 3. 그 날짜의 슬롯들
    for (let s = ws; s + lengthMinutes <= we; s += slotMinutes) {
      const e = s + lengthMinutes;
      const availableMembers: string[] = [];
      const unavailableMembers: string[] = [];

      for (const memberId of memberIds) {
        const ma = busyMap.get(memberId);
        const ranges = ma ? busyRangesOn(ma.busy, d) : [];
        let isBusy = false;
        for (const [bs, be] of ranges) {
          if (bs < e && be > s) {
            isBusy = true;
            break;
          }
        }
        if (isBusy) {
          unavailableMembers.push(memberId);
        } else {
          availableMembers.push(memberId);
        }
      }

      const attendanceRate = availableMembers.length / memberIds.length;
      if (attendanceRate < MIN_ATTENDANCE) continue;

      const isPreferredTime = s >= toMin(preferredStart) && e <= toMin(preferredEnd);
      const start = toHHMM(s);
      const end = toHHMM(e);
      const slot: TimeSlot = {
        id: `${d}T${start}-${end}`,
        date: d,
        start,
        end,
        availableMembers,
        unavailableMembers,
        totalMembers: memberIds.length,
        attendanceRate,
        isPreferredTime,
      };
      allSlots.push(slot);
    }

    d = addDays(d, 1);
  }

  // meetingNumber === 1이고 전원 참석 후보가 하나라도 있으면 전원 참석만 남김
  if (meetingNumber === 1) {
    const hasFullAttendance = allSlots.some((slot) => slot.attendanceRate === 1);
    if (hasFullAttendance) {
      const filtered = allSlots.filter((slot) => slot.attendanceRate === 1);
      return sortAndDedup(filtered);
    }
  }

  return sortAndDedup(allSlots);
}

/** 정렬 후 같은 날짜 겹침 제거 */
function sortAndDedup(slots: TimeSlot[]): TimeSlot[] {
  // 4. 정렬: date 오름 → attendanceRate 내림 → isPreferredTime true 먼저 → start 오름
  slots.sort((a, b) => {
    const dateComp = compareYmd(a.date, b.date);
    if (dateComp !== 0) return dateComp;
    if (a.attendanceRate !== b.attendanceRate) return b.attendanceRate - a.attendanceRate;
    if (a.isPreferredTime !== b.isPreferredTime) return a.isPreferredTime ? -1 : 1;
    return toMin(a.start) - toMin(b.start);
  });

  // 5. 같은 날짜에서 시간 겹침 제거
  const result: TimeSlot[] = [];
  const picked = new Map<YMD, [number, number][]>(); // 날짜 → 이미 선택된 [시작분, 끝분]

  for (const slot of slots) {
    const s = toMin(slot.start);
    const e = toMin(slot.end);
    const existing = picked.get(slot.date) || [];

    let overlaps = false;
    for (const [ps, pe] of existing) {
      if (s < pe && e > ps) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      result.push(slot);
      existing.push([s, e]);
      picked.set(slot.date, existing);
    }
  }

  return result;
}

/** 최종 추천 */
export function recommend(input: ScheduleInput): ScheduleResult {
  let L = rankAll(input, input.maxMeetingMinutes);
  let usedMinutes = input.maxMeetingMinutes;

  if (L.length === 0 && input.minMeetingMinutes < input.maxMeetingMinutes) {
    L = rankAll(input, input.minMeetingMinutes);
    usedMinutes = input.minMeetingMinutes;
  }

  const rest = L.filter((slot) => !input.excludedSlotIds.includes(slot.id));
  const slots = rest.slice(0, 3);
  const remaining = rest.length - slots.length;

  let reason: string | null = null;
  if (slots.length === 0) {
    if (L.length === 0) {
      reason = "참석률 50% 이상인 시간이 없습니다";
    } else {
      reason = "더 볼 후보가 없습니다";
    }
  }

  return { slots, remaining, usedMinutes, reason };
}
