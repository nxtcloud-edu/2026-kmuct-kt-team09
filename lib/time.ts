import type { YMD, HHMM, ISO, BusyInterval } from "@/lib/types";

/** "HH:MM" → 자정부터의 분 */
export function toMin(hhmm: HHMM): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → "HH:MM" */
export function toHHMM(minutes: number): HHMM {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** ISO 문자열을 Asia/Seoul 기준으로 파싱 → { ymd: "YYYY-MM-DD", minutes: 자정부터의 분 } */
export function kstParts(iso: ISO): { ymd: YMD; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  
  const year = get("year");
  const month = get("month");
  const day = get("day");
  let hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  // formatToParts가 자정을 "24"로 줄 수 있음 → 0으로 처리
  if (hour === 24) hour = 0;

  const ymd: YMD = `${year}-${month}-${day}`;
  const minutes = hour * 60 + minute;
  return { ymd, minutes };
}

/** YMD에 n일 더하기 (Date.UTC 정수 연산) */
export function addDays(ymd: YMD, n: number): YMD {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const shifted = new Date(utc + n * 86400000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** YMD → 요일 (0=일 … 6=토) */
export function weekdayOf(ymd: YMD): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** YMD 문자열 비교 (-1, 0, 1) */
export function compareYmd(a: YMD, b: YMD): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** 특정 날짜에 겹치는 busy 구간을 [시작분, 끝분] 배열로 (병합·정렬) */
export function busyRangesOn(busy: BusyInterval[], ymd: YMD): [number, number][] {
  const ranges: [number, number][] = [];

  for (const interval of busy) {
    const start = kstParts(interval.start);
    const end = kstParts(interval.end);

    // 이 busy가 ymd와 겹치는지 확인
    if (compareYmd(end.ymd, ymd) < 0 || compareYmd(start.ymd, ymd) > 0) {
      continue; // 완전히 이전 또는 이후
    }

    // ymd 날짜에 해당하는 부분만 추출
    let startMin = 0;
    let endMin = 1440;

    if (compareYmd(start.ymd, ymd) === 0) {
      startMin = start.minutes;
    }
    if (compareYmd(end.ymd, ymd) === 0) {
      endMin = end.minutes;
    }

    if (endMin > startMin) {
      ranges.push([startMin, endMin]);
    }
  }

  if (ranges.length === 0) return [];

  // 시작 순 정렬
  ranges.sort((a, b) => a[0] - b[0]);

  // 겹치거나 맞닿은 구간 병합
  const merged: [number, number][] = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    const curr = ranges[i];
    if (curr[0] <= last[1]) {
      // 겹침 또는 맞닿음
      last[1] = Math.max(last[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }

  return merged;
}
