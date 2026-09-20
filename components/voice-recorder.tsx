"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_SECONDS = 28; // 다글로 동기 API는 30초 이하만 받는다

type Props = {
  onTranscript: (text: string) => void;
};

export function VoiceRecorder({ onTranscript }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, []);

  async function send(blob: Blob) {
    setBusy(true);
    setMessage("음성을 글로 옮기는 중…");
    try {
      const form = new FormData();
      form.append("file", blob, "recording.weba");
      const res = await fetch("/api/stt/transcribe", { method: "POST", body: form });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error ?? "음성 인식에 실패했습니다.");
        return;
      }
      const text: string = json.data.transcript ?? "";
      if (!text) {
        setMessage("인식된 말이 없습니다. 조금 더 크게 말해 보세요.");
        return;
      }
      onTranscript(text);
      setMessage(`${text.length}자를 회의록에 옮겼습니다.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "음성 인식에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 0) void send(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setMessage("마이크를 쓸 수 없습니다. 브라우저 권한을 확인해 주세요.");
    }
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant={recording ? "default" : "outline"}
        onClick={recording ? stop : start}
        disabled={busy}
      >
        {recording ? `녹음 중지 (${MAX_SECONDS - seconds}초)` : busy ? "변환 중…" : "음성으로 받아쓰기"}
      </Button>
      {recording && (
        <span className="text-sm text-gray-500">
          말한 내용이 회의록에 자동으로 붙습니다. 최대 {MAX_SECONDS}초.
        </span>
      )}
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}
