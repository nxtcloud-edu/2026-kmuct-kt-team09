#!/usr/bin/env node
// TeamFlow e2e 점검 스크립트.
// 사용: node scripts/e2e.mjs [baseUrl]  (기본 http://localhost:3000)
// 서버는 MOCK_GOOGLE=true, MOCK_CLAUDE=true로 떠 있어야 한다.
// Node 내장 fetch만 쓴다. 외부 라이브러리 없음.
//
// 같은 서버에 여러 번 돌려도 통과해야 하므로 매 실행마다 새 프로젝트를 만든다
// (멤버 이메일에 타임스탬프를 섞어 유일성을 확보).
//
// 참고: 4·11·13번 스텝은 B(스케줄러)·C(크론) 담당 영역이 아직 mock 고정이거나
// 라우트가 없을 수 있다. 그런 경우 있는 그대로 FAIL로 보고한다(조건을 물타지 않음).

const baseUrl = process.argv[2] ?? "http://localhost:3000";

let failed = 0;

/** 이름과 함수를 받아 실행하고 OK/FAIL을 출력한다. FAIL이어도 다음 스텝은 계속 진행한다. */
async function step(name, fn) {
  try {
    await fn();
    console.log(`OK ${name}`);
  } catch (err) {
    failed += 1;
    const reason = err && err.message ? err.message : String(err);
    console.log(`FAIL ${name}: ${reason}`);
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

/** 한국 날짜 기준 오늘 + days일 후를 "YYYY-MM-DD"로 돌려준다. */
function seoulDatePlusDays(days) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);
  const d = Number(parts.find((p) => p.type === "day").value);
  // UTC 기준 날짜 연산으로 타임존 흔들림을 피한다. 시각 정보는 버리고 날짜만 다룬다.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function postJson(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function getJson(path, headers) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

const SLOT_ID_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}-\d{2}:\d{2}$/;

async function main() {
  const runTag = Date.now();
  const deadline = seoulDatePlusDays(14);

  /** @type {string | null} */
  let projectId = null;
  /** @type {any[]} */
  let firstRecommendSlots = [];
  /** @type {any} */
  let confirmedSlot = null;
  /** @type {string | null} */
  let meetingId = null;

  // 1. POST /api/projects
  await step("POST /api/projects", async () => {
    const body = {
      project: {
        name: "E2E 팀",
        goal: "e2e 점검",
        deadline,
        expectedMeetingCount: 2,
        availableStart: "10:00",
        availableEnd: "21:00",
        preferredStart: "18:00",
        preferredEnd: "21:00",
        minMeetingMinutes: 60,
        maxMeetingMinutes: 60,
        weekdays: [1, 2, 3, 4, 5],
        meetingType: "offline",
      },
      members: [1, 2, 3, 4].map((i) => ({
        name: `e2e${i}`,
        email: `e2e${i}-${runTag}@example.invalid`,
      })),
    };
    const { status, json } = await postJson("/api/projects", body);
    assert(status === 201, `expected 201, got ${status}`);
    assert(json && json.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(typeof json.data?.project?.id === "string" && json.data.project.id.length > 0, "project.id missing");
    assert(Array.isArray(json.data?.members) && json.data.members.length === 4, "members must be 4");
    projectId = json.data.project.id;
  });

  if (!projectId) {
    console.log("\n프로젝트 생성 실패로 나머지 스텝을 건너뜁니다.");
    process.exitCode = 1;
    return;
  }

  // 2. GET /api/projects/:id
  await step("GET /api/projects/:id", async () => {
    const { status, json } = await getJson(`/api/projects/${projectId}`);
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(Array.isArray(json.data?.members) && json.data.members.length === 4, "members must be 4");
    assert(Array.isArray(json.data?.meetings) && json.data.meetings.length === 0, "meetings must be 0");
  });

  // 3. GET /api/calendar/availability
  await step("GET /api/calendar/availability", async () => {
    const { status, json } = await getJson(`/api/calendar/availability?projectId=${projectId}`);
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(
      Array.isArray(json.data?.availability) && json.data.availability.length === 4,
      "availability length must be 4"
    );
    assert(json.data?.source === "mock", `expected source "mock", got ${json.data?.source}`);
  });

  // 4. POST /api/schedule/recommend (excludedSlotIds: [])
  await step("POST /api/schedule/recommend (first)", async () => {
    const { status, json } = await postJson("/api/schedule/recommend", {
      projectId,
      excludedSlotIds: [],
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    const slots = json.data?.slots;
    assert(Array.isArray(slots) && slots.length >= 1 && slots.length <= 3, `slots length must be 1~3, got ${slots?.length}`);
    for (const s of slots) {
      assert(typeof s.attendanceRate === "number" && s.attendanceRate >= 0.5, `attendanceRate must be >= 0.5, got ${s.attendanceRate}`);
      assert(SLOT_ID_RE.test(s.id), `slot.id shape mismatch: ${s.id}`);
    }
    firstRecommendSlots = slots;
  });

  // 5. POST /api/schedule/recommend (excludedSlotIds: 4의 id들)
  await step("POST /api/schedule/recommend (excluded)", async () => {
    const excludedSlotIds = firstRecommendSlots.map((s) => s.id);
    const { status, json } = await postJson("/api/schedule/recommend", {
      projectId,
      excludedSlotIds,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    const slots = json.data?.slots ?? [];
    const overlap = slots.filter((s) => excludedSlotIds.includes(s.id));
    assert(overlap.length === 0, `excluded id들과 겹치는 slot이 있음: ${overlap.map((s) => s.id).join(", ")}`);
  });

  // 6. POST /api/schedule/confirm (첫 슬롯) → 201, 중복 호출 → 200 동일 id
  await step("POST /api/schedule/confirm (create + idempotent)", async () => {
    assert(firstRecommendSlots.length > 0, "확정할 슬롯이 없음(4번 스텝 실패로 추정)");
    confirmedSlot = firstRecommendSlots[0];

    const first = await postJson("/api/schedule/confirm", {
      projectId,
      slot: confirmedSlot,
    });
    assert(first.status === 201, `expected 201, got ${first.status}`);
    assert(first.json?.ok === true, `expected ok:true, got ${JSON.stringify(first.json)}`);
    assert(first.json.data?.meeting?.number === 1, `meeting.number must be 1, got ${first.json.data?.meeting?.number}`);
    const firstMeetingId = first.json.data.meeting.id;

    const second = await postJson("/api/schedule/confirm", {
      projectId,
      slot: confirmedSlot,
    });
    assert(second.status === 200, `중복 confirm은 200이어야 하는데 ${second.status} (현재 addMeeting에 중복 방지 로직 없음)`);
    assert(
      second.json?.data?.meeting?.id === firstMeetingId,
      `중복 confirm의 meeting.id가 달라짐: ${second.json?.data?.meeting?.id} !== ${firstMeetingId} (중복 생성됨)`
    );

    meetingId = firstMeetingId;
  });

  if (!meetingId) {
    console.log("\n회의 확정 실패로 이후 회의 관련 스텝은 실패할 수 있습니다.");
  }

  // 7. POST /api/meeting/agenda
  await step("POST /api/meeting/agenda", async () => {
    const { status, json } = await postJson("/api/meeting/agenda", {
      projectId,
      meetingId,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(
      Array.isArray(json.data?.agenda?.agendaItems) && json.data.agenda.agendaItems.length >= 1,
      "agenda.agendaItems length must be >= 1"
    );
  });

  // 8. POST /api/email/send (MEETING_CONFIRMED)
  await step("POST /api/email/send (MEETING_CONFIRMED)", async () => {
    const { status, json } = await postJson("/api/email/send", {
      projectId,
      kind: "MEETING_CONFIRMED",
      meetingId,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(json.data?.sent === 4, `sent must be 4, got ${json.data?.sent}`);
  });

  // 9. POST /api/meeting/summarize
  await step("POST /api/meeting/summarize", async () => {
    const short = await postJson("/api/meeting/summarize", {
      projectId,
      meetingId,
      rawNotes: "짧음",
    });
    assert(short.status === 400, `5자 rawNotes는 400이어야 하는데 ${short.status}`);

    const longNotes =
      "오늘 회의에서 핵심 기능 범위를 확정했다. 요구사항 명세서 담당자를 배정했다. 다음 회의 전까지 각자 초안을 작성하기로 했다.";
    const long = await postJson("/api/meeting/summarize", {
      projectId,
      meetingId,
      rawNotes: longNotes,
    });
    assert(long.status === 200, `expected 200, got ${long.status}`);
    assert(long.json?.ok === true, `expected ok:true, got ${JSON.stringify(long.json)}`);
    const summary = long.json.data?.summary;
    assert(summary && typeof summary === "object", "summary object missing");
    const keys = Object.keys(summary).sort();
    const expected = ["actionItems", "blockers", "decisions", "nextAgenda", "summary"];
    assert(
      keys.length === expected.length && keys.every((k, i) => k === expected[i]),
      `summary 키가 정확히 일치하지 않음: [${keys.join(", ")}]`
    );
  });

  // 10. POST /api/email/send (MEETING_SUMMARY)
  await step("POST /api/email/send (MEETING_SUMMARY)", async () => {
    const { status, json } = await postJson("/api/email/send", {
      projectId,
      kind: "MEETING_SUMMARY",
      meetingId,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    assert(json.data?.sent === 4, `sent must be 4, got ${json.data?.sent}`);
  });

  // 11. POST /api/schedule/recommend (excludedSlotIds: []) → 확정한 date의 슬롯이 없어야 함
  await step("POST /api/schedule/recommend (confirmed date excluded)", async () => {
    const { status, json } = await postJson("/api/schedule/recommend", {
      projectId,
      excludedSlotIds: [],
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    const slots = json.data?.slots ?? [];
    const sameDate = slots.filter((s) => s.date === confirmedSlot?.date);
    assert(
      sameDate.length === 0,
      `확정한 날짜(${confirmedSlot?.date})의 슬롯이 여전히 추천됨(스케줄러가 확정 slot을 제외하지 않음)`
    );
  });

  // 12. POST /api/report/generate → 8개 섹션, 첫 제목, 이어서 프로젝트 status closed
  await step("POST /api/report/generate", async () => {
    const { status, json } = await postJson("/api/report/generate", { projectId });
    assert(status === 200, `expected 200, got ${status}`);
    assert(json?.ok === true, `expected ok:true, got ${JSON.stringify(json)}`);
    const sections = json.data?.report?.sections;
    assert(Array.isArray(sections) && sections.length === 8, `sections length must be 8, got ${sections?.length}`);
    assert(sections[0]?.title === "프로젝트 개요", `첫 섹션 제목이 다름: ${sections[0]?.title}`);

    const projRes = await getJson(`/api/projects/${projectId}`);
    assert(projRes.status === 200, `GET project expected 200, got ${projRes.status}`);
    assert(
      projRes.json?.data?.project?.status === "closed",
      `프로젝트 status가 closed가 아님: ${projRes.json?.data?.project?.status}`
    );
  });

  // 13. GET /api/cron/remind (헤더 없음) → 401
  await step("GET /api/cron/remind (no header)", async () => {
    const { status } = await getJson("/api/cron/remind");
    assert(status === 401, `expected 401, got ${status}`);
  });

  console.log("");
  if (failed > 0) {
    console.log(`${failed}개 스텝 실패.`);
    process.exitCode = 1;
  } else {
    console.log("모든 스텝 통과.");
  }
}

await main();
