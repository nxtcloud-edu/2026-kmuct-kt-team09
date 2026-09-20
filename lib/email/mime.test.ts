import { describe, expect, it } from "vitest";
import { buildMime } from "./send";

describe("buildMime", () => {
  it("첨부가 없으면 단일 파트 그대로", () => {
    const m = buildMime(["a@example.invalid"], "제목 한글", "<p>본문</p>");
    expect(m).toContain("Content-Type: text/html; charset=UTF-8");
    expect(m).not.toContain("multipart/mixed");
    expect(m).not.toContain("boundary");
    expect(m).toContain("Subject: =?UTF-8?B?");
  });

  it("첨부가 있으면 multipart/mixed로 감싸고 경계를 닫는다", () => {
    const m = buildMime(["a@example.invalid"], "제목", "<p>본문</p>", [
      { filename: "1회차_회의록.md", mimeType: "text/markdown", content: "# 제목\n- 항목" },
    ]);
    expect(m).toContain("multipart/mixed");
    const boundary = /boundary="([^"]+)"/.exec(m)?.[1];
    expect(boundary).toBeTruthy();
    // 본문 파트 + 첨부 파트 + 종료 경계 = 3회 등장
    expect(m.split(`--${boundary}`).length - 1).toBe(3);
    expect(m.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
    expect(m).toContain("Content-Disposition: attachment; filename==?UTF-8?B?");
    expect(m).toContain("Content-Type: text/markdown");
  });

  it("ASCII 파일 이름은 따옴표로 그대로", () => {
    const m = buildMime(["a@example.invalid"], "s", "<p>b</p>", [
      { filename: "report.md", mimeType: "text/markdown", content: "x" },
    ]);
    expect(m).toContain('filename="report.md"');
  });
});
