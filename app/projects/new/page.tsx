"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import type { CreateProjectReq } from "@/lib/types";

interface TeamMember {
  name: string;
  email: string;
}

interface FormErrors {
  name?: string;
  goal?: string;
  deadline?: string;
  expectedMeetingCount?: string;
  availableTime?: string;
  preferredTime?: string;
  meetingMinutes?: string;
  weekdays?: string;
  members?: { [index: number]: { name?: string; email?: string } };
  general?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [expectedMeetingCount, setExpectedMeetingCount] = useState(4);
  const [meetingType, setMeetingType] = useState<"online" | "offline">("online");
  const [availableStart, setAvailableStart] = useState("10:00");
  const [availableEnd, setAvailableEnd] = useState("21:00");
  const [preferredStart, setPreferredStart] = useState("18:00");
  const [preferredEnd, setPreferredEnd] = useState("21:00");
  const [minMeetingMinutes, setMinMeetingMinutes] = useState(60);
  const [maxMeetingMinutes, setMaxMeetingMinutes] = useState(90);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // 월~금
  const [members, setMembers] = useState<TeamMember[]>([
    { name: "", email: "" },
    { name: "", email: "" },
  ]);

  const toggleWeekday = (day: number) => {
    if (weekdays.includes(day)) {
      setWeekdays(weekdays.filter((d) => d !== day));
    } else {
      setWeekdays([...weekdays, day].sort((a, b) => a - b));
    }
  };

  const addMember = () => {
    if (members.length < 8) {
      setMembers([...members, { name: "", email: "" }]);
    }
  };

  const removeMember = (index: number) => {
    if (members.length > 2) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, field: "name" | "email", value: string) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // 프로젝트 이름
    if (!name.trim()) {
      newErrors.name = "프로젝트 이름을 입력해 주세요.";
    }

    // 프로젝트 목표
    if (!goal.trim()) {
      newErrors.goal = "프로젝트 목표를 입력해 주세요.";
    }

    // 데드라인
    if (!deadline) {
      newErrors.deadline = "데드라인을 선택해 주세요.";
    } else {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
      if (deadline < today) {
        newErrors.deadline = "데드라인은 오늘 이후여야 합니다.";
      }
    }

    // 예상 회의 횟수
    if (expectedMeetingCount < 1 || expectedMeetingCount > 10) {
      newErrors.expectedMeetingCount = "예상 회의 횟수는 1~10 사이여야 합니다.";
    }

    // 회의 가능 시간대
    if (availableStart >= availableEnd) {
      newErrors.availableTime = "시작 시간은 종료 시간보다 빨라야 합니다.";
    }

    // 선호 시간대
    if (preferredStart >= preferredEnd) {
      newErrors.preferredTime = "시작 시간은 종료 시간보다 빨라야 합니다.";
    } else if (preferredStart < availableStart || preferredEnd > availableEnd) {
      newErrors.preferredTime = "선호 시간대는 회의 가능 시간대 안에 있어야 합니다.";
    }

    // 회의 길이
    if (minMeetingMinutes > maxMeetingMinutes) {
      newErrors.meetingMinutes = "최소 시간은 최대 시간보다 작아야 합니다.";
    }

    // 요일
    if (weekdays.length === 0) {
      newErrors.weekdays = "최소 1개 이상의 요일을 선택해 주세요.";
    }

    // 팀원
    const memberErrors: { [index: number]: { name?: string; email?: string } } = {};
    const emails = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    members.forEach((member, index) => {
      const errors: { name?: string; email?: string } = {};

      if (!member.name.trim()) {
        errors.name = "이름을 입력해 주세요.";
      }

      if (!member.email.trim()) {
        errors.email = "이메일을 입력해 주세요.";
      } else if (!emailRegex.test(member.email)) {
        errors.email = "올바른 이메일 형식이 아닙니다.";
      } else if (emails.has(member.email)) {
        errors.email = "중복된 이메일입니다.";
      } else {
        emails.add(member.email);
      }

      if (errors.name || errors.email) {
        memberErrors[index] = errors;
      }
    });

    if (Object.keys(memberErrors).length > 0) {
      newErrors.members = memberErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    const body: CreateProjectReq = {
      project: {
        name,
        goal,
        deadline,
        expectedMeetingCount,
        meetingType,
        availableStart,
        availableEnd,
        preferredStart,
        preferredEnd,
        minMeetingMinutes,
        maxMeetingMinutes,
        weekdays,
      },
      members: members.map((m) => ({
        name: m.name,
        email: m.email,
      })),
    };

    const result = await api.createProject(body);

    if (result.ok) {
      router.push(`/projects/${result.data.project.id}`);
    } else {
      setErrors({ general: result.error });
      setSubmitting(false);
    }
  };

  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트 만들기</CardTitle>
          <CardDescription>
            팀 프로젝트 정보와 팀원을 입력하고 회의 일정을 조율하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {errors.general}
              </div>
            )}

            {/* 프로젝트 이름 */}
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트 이름 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 캠퍼스 분실물 찾기 앱"
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* 프로젝트 목표 */}
            <div className="space-y-2">
              <Label htmlFor="goal">프로젝트 목표 *</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="프로젝트의 목표와 산출물을 간단히 설명해 주세요."
                rows={3}
              />
              {errors.goal && <p className="text-sm text-red-600">{errors.goal}</p>}
            </div>

            {/* 데드라인 */}
            <div className="space-y-2">
              <Label htmlFor="deadline">데드라인 *</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              {errors.deadline && <p className="text-sm text-red-600">{errors.deadline}</p>}
            </div>

            {/* 예상 회의 횟수 */}
            <div className="space-y-2">
              <Label htmlFor="expectedMeetingCount">예상 회의 횟수 *</Label>
              <Input
                id="expectedMeetingCount"
                type="number"
                min={1}
                max={10}
                value={expectedMeetingCount}
                onChange={(e) => setExpectedMeetingCount(Number(e.target.value))}
              />
              {errors.expectedMeetingCount && (
                <p className="text-sm text-red-600">{errors.expectedMeetingCount}</p>
              )}
            </div>

            {/* 회의 형태 */}
            <div className="space-y-2">
              <Label>회의 형태 *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="meetingType"
                    value="online"
                    checked={meetingType === "online"}
                    onChange={() => setMeetingType("online")}
                  />
                  <span>온라인 (Google Meet 자동 생성)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="meetingType"
                    value="offline"
                    checked={meetingType === "offline"}
                    onChange={() => setMeetingType("offline")}
                  />
                  <span>오프라인 (직접 만남)</span>
                </label>
              </div>
            </div>

            {/* 회의 가능 시간대 */}
            <div className="space-y-2">
              <Label>회의 가능 시간대 *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={availableStart}
                  onChange={(e) => setAvailableStart(e.target.value)}
                />
                <span>~</span>
                <Input
                  type="time"
                  value={availableEnd}
                  onChange={(e) => setAvailableEnd(e.target.value)}
                />
              </div>
              {errors.availableTime && (
                <p className="text-sm text-red-600">{errors.availableTime}</p>
              )}
            </div>

            {/* 선호 시간대 */}
            <div className="space-y-2">
              <Label>선호 시간대 *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={preferredStart}
                  onChange={(e) => setPreferredStart(e.target.value)}
                />
                <span>~</span>
                <Input
                  type="time"
                  value={preferredEnd}
                  onChange={(e) => setPreferredEnd(e.target.value)}
                />
              </div>
              {errors.preferredTime && (
                <p className="text-sm text-red-600">{errors.preferredTime}</p>
              )}
            </div>

            {/* 회의 길이 */}
            <div className="space-y-2">
              <Label>회의 길이 (분) *</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    step={30}
                    value={minMeetingMinutes}
                    onChange={(e) => setMinMeetingMinutes(Number(e.target.value))}
                    placeholder="최소"
                  />
                </div>
                <span>~</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    step={30}
                    value={maxMeetingMinutes}
                    onChange={(e) => setMaxMeetingMinutes(Number(e.target.value))}
                    placeholder="최대"
                  />
                </div>
              </div>
              {errors.meetingMinutes && (
                <p className="text-sm text-red-600">{errors.meetingMinutes}</p>
              )}
            </div>

            {/* 회의 가능한 요일 */}
            <div className="space-y-2">
              <Label>회의 가능한 요일 *</Label>
              <div className="flex gap-2 flex-wrap">
                {weekdayLabels.map((label, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={weekdays.includes(index)}
                      onChange={() => toggleWeekday(index)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {errors.weekdays && <p className="text-sm text-red-600">{errors.weekdays}</p>}
            </div>

            {/* 팀원 */}
            <div className="space-y-2">
              <Label>팀원 * (최소 2명, 최대 8명)</Label>
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {index === 0 ? "팀장 (나)" : `팀원 ${index + 1}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember(index)}
                        disabled={index === 0 || members.length <= 2}
                      >
                        삭제
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Input
                          placeholder="이름"
                          value={member.name}
                          onChange={(e) => updateMember(index, "name", e.target.value)}
                        />
                        {errors.members?.[index]?.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.members[index].name}
                          </p>
                        )}
                      </div>
                      <div>
                        <Input
                          placeholder="이메일"
                          type="email"
                          value={member.email}
                          onChange={(e) => updateMember(index, "email", e.target.value)}
                        />
                        {errors.members?.[index]?.email && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.members[index].email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addMember}
                disabled={members.length >= 8}
              >
                팀원 추가
              </Button>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "만드는 중…" : "프로젝트 만들기"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
